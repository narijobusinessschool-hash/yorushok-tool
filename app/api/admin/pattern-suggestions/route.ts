import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET: 提案一覧を取得
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const { data, error } = await supabaseAdmin
    .from("usage_events")
    .select("id, meta, created_at")
    .eq("event_type", "pattern_suggestion")
    .eq("meta->>status", status)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ suggestions: [] });
  const suggestions = (data ?? []).map((d) => ({
    id: d.id,
    pattern: d.meta?.pattern ?? "",
    evidence: d.meta?.evidence ?? "",
    category: d.meta?.category ?? null,
    confidence: d.meta?.confidence ?? 50,
    status: d.meta?.status ?? "pending",
    createdAt: d.created_at,
  }));
  return NextResponse.json({ suggestions });
}

// POST: AIが新しいパターンを分析・提案 or 既存の評価更新
export async function POST(req: NextRequest) {
  const body = await req.json();

  // 既存提案の評価更新 (good/bad)
  if (body.action === "review" && body.id && body.status) {
    const { data: existing } = await supabaseAdmin
      .from("usage_events")
      .select("meta")
      .eq("id", body.id)
      .single();
    if (!existing) return NextResponse.json({ ok: false });
    await supabaseAdmin
      .from("usage_events")
      .update({ meta: { ...existing.meta, status: body.status, reviewedAt: new Date().toISOString() } })
      .eq("id", body.id);
    return NextResponse.json({ ok: true });
  }

  // 新規パターン分析・生成
  try {
    // 直近の添削データを取得
    const { data: drafts } = await supabaseAdmin
      .from("draft_results")
      .select("body_score, improved_text, category, created_at")
      .order("created_at", { ascending: false })
      .limit(60);

    // コピーされた文章を取得
    const { data: copies } = await supabaseAdmin
      .from("usage_events")
      .select("meta, created_at")
      .eq("event_type", "copy_body")
      .order("created_at", { ascending: false })
      .limit(30);

    // フィードバックを取得
    const { data: feedbacks } = await supabaseAdmin
      .from("usage_events")
      .select("meta, created_at")
      .eq("event_type", "feedback")
      .order("created_at", { ascending: false })
      .limit(30);

    // 既存提案（重複防止）
    const { data: existingSuggestions } = await supabaseAdmin
      .from("usage_events")
      .select("meta")
      .eq("event_type", "pattern_suggestion")
      .order("created_at", { ascending: false })
      .limit(20);
    const existingPatterns = (existingSuggestions ?? []).map((e) => e.meta?.pattern ?? "").join("\n");

    const draftSummary = (drafts ?? [])
      .slice(0, 30)
      .map((d) => `[${d.category ?? "?"}] スコア${d.body_score}点: ${(d.improved_text ?? "").slice(0, 80)}`)
      .join("\n");

    const copySummary = (copies ?? [])
      .map((c) => `コピー済み[${c.meta?.category ?? "?"}]: ${(c.meta?.improvedText ?? "").slice(0, 80)}`)
      .join("\n");

    const feedbackSummary = (feedbacks ?? [])
      .map((f) => `評価:${f.meta?.rating ?? "?"} 理由:${f.meta?.reason ?? "-"}`)
      .join("\n");

    const prompt = `あなたは夜職業界のライティング・マーケティング専門家です。
以下のデータを分析し、「効果的な文章パターン」を5つ発見・提案してください。

## 添削データ（スコア付き）
${draftSummary || "データなし"}

## 実際にコピーされた文章
${copySummary || "データなし"}

## ユーザーフィードバック
${feedbackSummary || "データなし"}

## すでに提案済みのパターン（重複禁止）
${existingPatterns || "なし"}

## 指示
- スコアが高い・コピーされた・「使う予定」評価の文章から共通パターンを発見する
- 逆に「使わない」評価・低スコアの文章の共通パターンも発見する
- 具体的で実践的なパターンにする（「〜すると効果的」「〜はNGパターン」）
- 重複する提案は絶対にしない
- 以下のJSON配列形式で返す:

[
  {
    "pattern": "パターンの説明（具体的に。例: 冒頭に疑問形を使うとスコアが平均12点高い）",
    "evidence": "根拠となったデータの特徴（例: スコア80点以上の文章の7割に疑問形の冒頭が見られた）",
    "category": "写メ日記" または "オキニトーク" または "SNS" または null（全カテゴリ共通の場合）,
    "confidence": 50〜95の整数（データの確信度）
  }
]`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "あなたは夜職ライティング専門の分析AIです。JSONのみ返してください。" },
        { role: "user", content: prompt },
      ],
    });

    const content = res.choices[0]?.message?.content ?? "{}";
    let parsed: Array<{ pattern: string; evidence: string; category: string | null; confidence: number }> = [];
    try {
      const json = JSON.parse(content);
      parsed = Array.isArray(json) ? json : (json.patterns ?? json.suggestions ?? []);
    } catch { parsed = []; }

    // Supabaseに保存
    const inserts = parsed.slice(0, 5).map((p) => ({
      event_type: "pattern_suggestion",
      user_id: null,
      meta: {
        pattern: p.pattern,
        evidence: p.evidence,
        category: p.category ?? null,
        confidence: p.confidence ?? 60,
        status: "pending",
      },
    }));

    if (inserts.length > 0) {
      await supabaseAdmin.from("usage_events").insert(inserts);
    }

    return NextResponse.json({ ok: true, count: inserts.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
