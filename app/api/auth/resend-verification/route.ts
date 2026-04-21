import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildVerificationExpiresAt,
  generateVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "メールアドレスを入力してください。" },
        { status: 400 },
      );
    }

    const emailNorm = email.trim().toLowerCase();

    // 大小区別なし検索（旧データに大文字残存があってもヒット）
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, email, email_verified, verification_expires_at")
      .ilike("email", emailNorm)
      .maybeSingle();

    // 会員が存在しない or 既に認証済みでも同一レスポンス（アカウント存在の探り防止）
    if (!member || member.email_verified) {
      return NextResponse.json({
        status: "sent",
        message:
          "認証メールを送信しました。メールが届かない場合は迷惑メールフォルダをご確認ください。",
      });
    }

    // レート制限: 前回送信から60秒以内の再送は拒否（Resend API 連打防止）
    if (member.verification_expires_at) {
      const lastSentMs =
        new Date(member.verification_expires_at).getTime() - 24 * 60 * 60 * 1000;
      const elapsedMs = Date.now() - lastSentMs;
      const COOLDOWN_MS = 60 * 1000;
      if (elapsedMs >= 0 && elapsedMs < COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            status: "rate_limited",
            message: `認証メールの再送は1分おきに可能です。あと${retryAfterSec}秒お待ちください。`,
          },
          { status: 429 },
        );
      }
    }

    const token = generateVerificationToken();
    const expiresAt = buildVerificationExpiresAt();

    await supabaseAdmin
      .from("members")
      .update({
        verification_token: token,
        verification_expires_at: expiresAt,
      })
      .eq("id", member.id);

    const result = await sendVerificationEmail(member.email, token);

    return NextResponse.json({
      status: result.ok ? "sent" : "send_failed",
      message: result.ok
        ? "認証メールを送信しました。メールが届かない場合は迷惑メールフォルダをご確認ください。"
        : "メールの送信に失敗しました。時間を置いて再度お試しください。",
    });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 },
    );
  }
}
