// メール認証ユーティリティ
// 登録時のトークン生成・Resend経由での認証メール送信を担う
import { randomBytes } from "crypto";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM =
  process.env.EMAIL_FROM_ADDRESS ?? "noreply@narijo.net";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME ?? "シャメコーチ";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://syamecoach.narijo.net";

export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

/** 認証トークンの有効期限（24時間後）を ISO 文字列で返す */
export function buildVerificationExpiresAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString();
}

function buildVerificationHtml(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f3f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <h1 style="margin:0 0 16px;font-size:20px;color:#2c2933;">メールアドレスの確認をお願いします</h1>
      <p style="margin:0 0 20px;color:#66616d;line-height:1.75;font-size:14px;">
        シャメコーチへのご登録ありがとうございます。<br>
        下のボタンをクリックして、メールアドレスの確認を完了してください。
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}" style="display:inline-block;padding:14px 36px;background:#e85d8a;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:15px;">
          メールアドレスを確認する
        </a>
      </div>
      <p style="margin:0 0 12px;color:#9b92a4;font-size:12px;line-height:1.7;">
        ボタンがクリックできない場合は、以下のURLをブラウザに貼り付けてください：<br>
        <span style="word-break:break-all;color:#66616d;">${verifyUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #ece7ef;margin:24px 0;">
      <p style="margin:0;color:#9b92a4;font-size:12px;line-height:1.7;">
        ・このリンクは <strong>24時間</strong> 有効です。<br>
        ・心当たりがない場合は、このメールを無視してください。<br>
        ・このメールは送信専用です。返信できません。
      </p>
    </div>
    <p style="text-align:center;margin:16px 0 0;color:#9b92a4;font-size:11px;">
      NBS（Narijo Business School）｜ シャメコーチ
    </p>
  </div>
</body>
</html>`;
}

/** 認証メールを送信（成功: ok=true、失敗: ok=false + error） */
export async function sendVerificationEmail(
  toEmail: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  const verifyUrl = `${APP_URL}/verify?token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
        to: toEmail,
        subject: "【シャメコーチ】メールアドレスの確認をお願いします",
        html: buildVerificationHtml(verifyUrl),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Resend API error: ${res.status} ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
