import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError, logEvent } from "@/lib/logger";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const memberId = formData.get("memberId") as string | null;

    if (!imageFile) {
      return NextResponse.json({ error: "画像がアップロードされていません。" }, { status: 400 });
    }

    // 過去の分析データを取得してコンテキストに使う
    let historyContext = "";
    if (memberId) {
      const { data: pastAnalyses } = await supabase
        .from("access_analyses")
        .select("period, stats, patterns, posting_timing")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false })
        .limit(6);

      if (pastAnalyses && pastAnalyses.length > 0) {
        historyContext = `\n\n## この女性の過去${pastAnalyses.length}ヶ月のアクセスデータ（参考にして比較・傾向把握をすること）\n` +
          pastAnalyses
            .map((a) => {
              const s = a.stats as { avg: number; max: { date: string; hits: number } };
              return `【${a.period}】平均: ${s.avg}hit/日, 最高: ${s.max?.hits}hit (${s.max?.date})`;
            })
            .join("\n");
      }
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const systemPrompt = `あなたは夜職（デリヘル・ソープ・メンズエステ・セクキャバ等）で働く女性の専属AIコンサルタントです。アクセス数データを分析し、予約・指名・来店を増やすための具体的な改善提案を行います。

# あなたの役割
- アクセス統計画面のスクリーンショットを正確に読み取る
- 日別・曜日別のアクセスパターンを深く分析する
- 高アクセス日・低アクセス日の共通点を見つける
- 過去データがあれば比較して傾向変化の原因を分析する
- 写メ日記・SNS投稿の最適なタイミングを特定する
- 具体的かつ今すぐ実行できる改善提案を出す

# スタンス
- 一緒に改善していくパートナーとして寄り添う
- 数字を根拠にした説得力ある分析をする
- ポジティブな変化は褒め、課題は優しく指摘する

# 出力ルール
- 必ずJSONのみで出力する
- 日本語で出力する
- 説明文・マークダウン・コードブロックは不要`;

    const userPrompt = `このスクリーンショットは夜職プラットフォームのアクセス統計画面です。${historyContext}

以下をJSONで出力してください：

{
  "period": "対象期間（例：2026年3月）",
  "stats": {
    "max": { "date": "最高アクセス日", "hits": 数値 },
    "avg": 今月平均数値,
    "prevMonthAvg": 前月平均数値（画面に表示されていれば）
  },
  "dailyData": [
    { "date": "日付（例：03/05）", "hits": 数値, "dayOfWeek": "曜日", "note": "特記事項（給料日・祝日等、なければ空文字）" }
  ],
  "patterns": {
    "highAccessDays": "高アクセス日の傾向説明（曜日・時期・イベントとの関係）",
    "lowAccessDays": "低アクセス日の傾向説明",
    "weekdayRanking": "曜日別アクセス傾向",
    "eventEffect": "給料日・祝日・特定日の影響（なければ空文字）",
    "vsHistory": "過去データとの比較・変化の要因分析（過去データがない場合は空文字）"
  },
  "suggestions": [
    { "title": "提案タイトル（10文字以内）", "detail": "具体的な行動と理由（2〜3文）" }
  ],
  "urgentActions": ["今すぐできること（短い行動文）"],
  "postingTiming": "写メ日記・SNS投稿の最適なタイミングの提案（具体的な曜日・時間帯）",
  "consultantMessage": "コンサルタントからの一言メッセージ（励ましと次のアクションを含む2〜3文）"
}

※ suggestions は3〜5件、urgentActions は3件程度出力してください。`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AIから応答がありませんでした。" }, { status: 500 });
    }

    const parsed = JSON.parse(content);

    // Supabaseに保存
    if (memberId) {
      await supabase.from("access_analyses").insert({
        member_id: memberId,
        period: parsed.period,
        stats: parsed.stats,
        daily_data: parsed.dailyData,
        patterns: parsed.patterns,
        suggestions: parsed.suggestions,
        urgent_actions: parsed.urgentActions,
        posting_timing: parsed.postingTiming,
      });
    }

    logEvent("access_analysis", memberId ?? undefined, { period: parsed.period });
    return NextResponse.json(parsed);
  } catch (error) {
    logError("access_analysis_error", "アクセス分析APIでエラー", { message: String(error) });
    return NextResponse.json({ error: "分析中にエラーが発生しました。" }, { status: 500 });
  }
}
