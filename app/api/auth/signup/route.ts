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

// Vercel / 標準的なリバースプロキシ経由でのクライアントIP取得
function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

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

    // マルチシグナル判定: 同一 device_fingerprint + 同一 IP + 1時間以内 のみブロック
    // 日本市場の均質端末環境（iPhone+Safari+日本語等）で指紋衝突が起きても誤爆しない。
    // 悪用パターン（同一PCで連続量産）は確実に block できる設計。
    const currentIp = getClientIp(req);
    if (deviceFingerprint && typeof deviceFingerprint === "string") {
      const { data: fpMatches } = await supabaseAdmin
        .from("members")
        .select("id, email_verified, verification_expires_at, signup_ip, created_at")
        .eq("device_fingerprint", deviceFingerprint);

      const nowMs = Date.now();
      const oneHourMs = 60 * 60 * 1000;

      const hasActiveDuplicate = (fpMatches ?? []).some((m) => {
        // 認証済 or 期限内の未認証レコードのみ有効。期限切れ未認証は「塞ぎ込み」として無視
        const isActive =
          m.email_verified ||
          (m.verification_expires_at &&
            new Date(m.verification_expires_at).getTime() > nowMs);
        if (!isActive) return false;

        // マルチシグナル判定: 同一 IP かつ 1時間以内の場合のみ block
        const ipMatch = !!(currentIp && m.signup_ip && m.signup_ip === currentIp);
        const timeMatch = !!(
          m.created_at && nowMs - new Date(m.created_at).getTime() < oneHourMs
        );
        return ipMatch && timeMatch;
      });

      if (hasActiveDuplicate) {
        return NextResponse.json(
          {
            error: "duplicate_device",
            message:
              "短時間で複数の登録が検出されました。同じ端末・同じネットワークからの連続登録は制限されています。心当たりがない場合は下記までお問い合わせください。",
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
        signup_ip: currentIp,
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
