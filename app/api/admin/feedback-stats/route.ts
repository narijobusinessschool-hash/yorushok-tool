import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // コピーイベント取得（本音ログ）
    const { data: copyEvents } = await supabaseAdmin
      .from("usage_events")
      .select("user_id, meta, created_at")
      .eq("event_type", "copy_body")
      .order("created_at", { ascending: false })
      .limit(200);

    // フィードバックイベント取得（明示的評価）
    const { data: feedbackEvents } = await supabaseAdmin
      .from("usage_events")
      .select("user_id, meta, created_at")
      .eq("event_type", "feedback")
      .order("created_at", { ascending: false })
      .limit(200);

    // 添削総数（generateイベント or draft_resultsのどちらか大きい方を採用）
    const [{ count: generateEventCount }, { count: draftResultCount }] = await Promise.all([
      supabaseAdmin
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "generate"),
      supabaseAdmin
        .from("draft_results")
        .select("*", { count: "exact", head: true }),
    ]);
    const totalGenerates = Math.max(generateEventCount ?? 0, draftResultCount ?? 0);

    const copies = copyEvents ?? [];
    const feedbacks = feedbackEvents ?? [];

    // 評価集計
    const ratingCount: Record<string, number> = { "使う予定": 0, "たぶん使う": 0, "使わない": 0 };
    const reasonCount: Record<string, number> = {};
    for (const f of feedbacks) {
      const rating = f.meta?.rating as string;
      if (rating && ratingCount[rating] !== undefined) ratingCount[rating]++;
      const reason = f.meta?.reason as string;
      if (reason) reasonCount[reason] = (reasonCount[reason] ?? 0) + 1;
    }

    // カテゴリ別コピー数
    const categoryCount: Record<string, number> = {};
    for (const c of copies) {
      const cat = (c.meta?.category as string) ?? "不明";
      categoryCount[cat] = (categoryCount[cat] ?? 0) + 1;
    }

    // 直近のフィードバック一覧（文章付き）
    const recentFeedbacks = feedbacks.slice(0, 30).map((f) => ({
      userId: f.user_id,
      rating: f.meta?.rating ?? null,
      reason: f.meta?.reason ?? null,
      improvedText: f.meta?.improvedText ?? null,
      category: f.meta?.category ?? null,
      createdAt: f.created_at,
    }));

    // 直近のコピー一覧（タイトル・copyType付き）
    const recentCopies = copies.slice(0, 30).map((c) => ({
      userId: c.user_id,
      improvedText: c.meta?.improvedText ?? null,
      copyType: c.meta?.copyType ?? "body",
      title: c.meta?.title ?? null,
      category: c.meta?.category ?? null,
      createdAt: c.created_at,
    }));

    return NextResponse.json({
      totalCopies: copies.length,
      totalFeedbacks: feedbacks.length,
      totalGenerates,
      copyRate: totalGenerates ? Math.round((copies.length / totalGenerates) * 100) : 0,
      feedbackRate: copies.length ? Math.round((feedbacks.length / copies.length) * 100) : 0,
      ratingCount,
      reasonCount,
      categoryCount,
      recentFeedbacks,
      recentCopies,
    });
  } catch {
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}
