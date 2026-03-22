import { NextResponse } from "next/server";

const ALERT_THRESHOLD_USD = 5.0; // $5以下でアラート

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no key" }, { status: 500 });

  try {
    // OpenAI Usage APIで残高確認
    const res = await fetch("https://api.openai.com/v1/dashboard/billing/subscription", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 500 });

    const data = await res.json();
    const hardLimit = data.hard_limit_usd ?? 0;

    // 今月の使用量を取得
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const usageRes = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
      { headers: { "Authorization": `Bearer ${apiKey}` } }
    );

    const usageData = usageRes.ok ? await usageRes.json() : { total_usage: 0 };
    const usedUsd = (usageData.total_usage ?? 0) / 100;
    const remainingUsd = hardLimit - usedUsd;

    // アラート閾値以下なら通知
    if (remainingUsd <= ALERT_THRESHOLD_USD && remainingUsd >= 0) {
      const { notifyOpenAiBillingAlert } = await import("@/lib/notify");
      await notifyOpenAiBillingAlert(remainingUsd);
    }

    return NextResponse.json({
      hardLimitUsd: hardLimit,
      usedUsd: parseFloat(usedUsd.toFixed(4)),
      remainingUsd: parseFloat(remainingUsd.toFixed(4)),
      alertThreshold: ALERT_THRESHOLD_USD,
      isAlert: remainingUsd <= ALERT_THRESHOLD_USD,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
