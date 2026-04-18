import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { notifyNewMember } from "@/lib/notify";
import {
  buildVerificationExpiresAt,
  generateVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password, deviceFingerprint } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください。" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上で設定してください。" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("email", email.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: "このメールアドレスはすでに登録されています。" }, { status: 409 });
    }

    // 端末指紋重複チェック（同一端末からの複アカ登録防止）
    // 期限切れ未認証レコードは「塞ぎ込み」として無視（正規ユーザーが認証メールを失くしても
    // 24時間後に同じ端末から再登録できる）。認証済み or 期限内の未認証レコードがあればブロック
    if (deviceFingerprint && typeof deviceFingerprint === "string") {
      const { data: fpMatches } = await supabaseAdmin
        .from("members")
        .select("id, email_verified, verification_expires_at")
        .eq("device_fingerprint", deviceFingerprint);

      const nowMs = Date.now();
      const hasActiveDuplicate = (fpMatches ?? []).some((m) => {
        if (m.email_verified) return true;
        if (m.verification_expires_at) {
          return new Date(m.verification_expires_at).getTime() > nowMs;
        }
        return true;
      });

      if (hasActiveDuplicate) {
        return NextResponse.json(
          {
            error: "duplicate_device",
            message:
              "この端末は既に登録されています。別のアカウントをお持ちの場合はそちらでログインしてください。心当たりがない場合は下記までお問い合わせください。",
            contactLine: "https://line.me/R/ti/p/%40201kgbng",
            contactEmail: "narijo.businessschool@gmail.com",
          },
          { status: 409 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = buildVerificationExpiresAt();

    const { data, error: insertError } = await supabaseAdmin
      .from("members")
      .insert({
        email: email.trim(),
        password: hashedPassword,
        role: "一般会員",
        status: "契約中",
        plan: "free",
        usage_count: 0,
        usage_limit: 20,
        usage_permission: true,
        note: "",
        device_fingerprint: deviceFingerprint || null,
        email_verified: false,
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt,
      })
      .select()
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: "登録に失敗しました。もう一度お試しください。" }, { status: 500 });
    }

    notifyNewMember(email.trim(), data.id).catch(() => {});

    // 認証メール送信（失敗しても登録は成功扱い、クライアントに再送ボタンを出す前提）
    const emailResult = await sendVerificationEmail(email.trim(), verificationToken);

    return NextResponse.json({
      status: "verification_sent",
      email: data.email,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? undefined : emailResult.error,
    });
  } catch {
    return NextResponse.json({ error: "登録処理中にエラーが発生しました。" }, { status: 500 });
  }
}
