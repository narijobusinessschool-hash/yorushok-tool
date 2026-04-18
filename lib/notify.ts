// lib/notify.ts
// 新規登録・重要イベントをメール+プッシュで管理者に通知する

const ADMIN_EMAIL = "narijo.businessschool@gmail.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const NTFY_TOPIC = process.env.NTFY_TOPIC ?? "";

/** Resend APIでメールを送信 */
async function sendEmail(subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "シャメコーチ <onboarding@resend.dev>",
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    });
  } catch { /* silent fail */ }
}

/** ntfy.shでプッシュ通知を送信 */
async function sendPush(title: string, message: string, tags?: string) {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        "Title": title,
        "Tags": tags ?? "bell",
        "Priority": "high",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: message,
    });
  } catch { /* silent fail */ }
}

/** 新規会員登録通知 */
export async function notifyNewMember(email: string, memberId: string | number) {
  const jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  await Promise.all([
    sendEmail(
      `🎉 新規会員登録: ${email}`,
      `<h2>新しい会員が登録しました</h2>
       <p><strong>メール:</strong> ${email}</p>
       <p><strong>会員ID:</strong> ${memberId}</p>
       <p><strong>登録日時:</strong> ${jst}</p>
       <hr>
       <p><a href="https://syamecoach.narijo.net/admin/members">管理画面で確認 →</a></p>`
    ),
    sendPush(
      "🎉 新規会員登録",
      `${email} が登録しました（${jst}）`,
      "tada,moneybag"
    ),
  ]);
}

/** OpenAI残高アラート通知 */
export async function notifyOpenAiBillingAlert(remainingUsd: number) {
  const jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  await Promise.all([
    sendEmail(
      `⚠️ OpenAI残高アラート: $${remainingUsd.toFixed(2)} 残り`,
      `<h2>OpenAI クレジット残高が少なくなっています</h2>
       <p><strong>残高:</strong> $${remainingUsd.toFixed(2)}</p>
       <p><strong>確認日時:</strong> ${jst}</p>
       <hr>
       <p><a href="https://platform.openai.com/usage">OpenAIダッシュボードで確認 →</a></p>
       <p>※ クレジットが0になるとAI添削が停止します。早めにチャージしてください。</p>`
    ),
    sendPush(
      "⚠️ OpenAI残高警告",
      `残高 $${remainingUsd.toFixed(2)} — チャージしてください`,
      "warning,credit_card"
    ),
  ]);
}
