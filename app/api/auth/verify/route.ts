import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "invalid_token", message: "無効なリンクです。" },
        { status: 400 },
      );
    }

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, name, email, role, plan, email_verified, verification_expires_at")
      .eq("verification_token", token)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        {
          error: "invalid_token",
          message: "このリンクは無効です。再度メール認証を行ってください。",
        },
        { status: 404 },
      );
    }

    if (member.email_verified) {
      return NextResponse.json({
        status: "already_verified",
        message: "すでに認証済みです。ログインしてご利用ください。",
        email: member.email,
      });
    }

    // 期限切れチェック
    if (member.verification_expires_at) {
      const expiresAt = new Date(member.verification_expires_at).getTime();
      if (Date.now() > expiresAt) {
        return NextResponse.json(
          {
            error: "expired",
            message:
              "このリンクは有効期限が切れています。ログイン画面から認証メールの再送をお試しください。",
          },
          { status: 410 },
        );
      }
    }

    // 認証成功: トークンを消して verified=true に
    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({
        email_verified: true,
        verification_token: null,
        verification_expires_at: null,
      })
      .eq("id", member.id);

    if (updateError) {
      return NextResponse.json(
        { error: "db_error", message: "認証処理中にエラーが発生しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "verified",
      email: member.email,
      message: "メールアドレスの確認が完了しました。",
      // 認証完了と同時に自動ログインできるよう、フロント側で localStorage/cookie
      // に設定する user 情報を返す（トークンは既に無効化済みなので再利用不可）
      user: {
        id: member.id,
        name: member.name ?? "",
        email: member.email,
        role: member.role,
        plan: member.plan ?? "free",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "server_error", message: "サーバーエラーが発生しました。" },
      { status: 500 },
    );
  }
}
