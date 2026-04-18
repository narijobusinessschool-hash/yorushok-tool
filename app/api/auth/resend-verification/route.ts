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

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, email, email_verified")
      .eq("email", email.trim())
      .maybeSingle();

    // 会員が存在しない or 既に認証済みでも同一レスポンス（アカウント存在の探り防止）
    if (!member || member.email_verified) {
      return NextResponse.json({
        status: "sent",
        message:
          "認証メールを送信しました。メールが届かない場合は迷惑メールフォルダをご確認ください。",
      });
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
