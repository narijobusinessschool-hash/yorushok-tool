import OpenAI from "openai";
import { NextResponse } from "next/server";
import { logError, logEvent } from "@/lib/logger";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "画像がアップロードされていません。" }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const systemPrompt = `あなたは夜職（デリヘル・ソープ・メンズエステ・セクキャバ等）で働く女性のアクセス数データを分析し、予約・指名・来店を増やすための具体的な改善提案を行うスペシャリストです。

# あなたの役割
- アクセス統計画面のスクリーンショットを読み取る
- 日別・曜日別のアクセスパターンを分析する
- 高アクセス日・低アクセス日の共通点を見つける
- 写メ日記・SNS投稿の最適なタイミングを特定する
- 具体的かつ今すぐ実行できる改善提案を出す

# 出力ルール
- 必ずJSONのみで出力する
- 日本語で出力する
- 説明文・マークダウン・コードブロックは不要
- スコアや数値は画像から正確に読み取る`;

    const userPrompt = `このスクリーンショットは夜職プラットフォームのアクセス統計画面です。

以下をJSONで出力してください：

{
  "period": "対象期間（例：2026年3月）",
  "stats": {
    "max": { "date": "最高アクセス日", "hits": 数値 },
    "avg": 今月平均数値,
    "prevMonthAvg": 前月平均数値（あれば）
  },
  "dailyData": [
    { "date": "日付（例：03/05）", "hits": 数値, "dayOfWeek": "曜日", "note": "特記事項（給料日・祝日等、なければ空文字）" }
  ],
  "patterns": {
    "highAccessDays": "高アクセス日の傾向説明（曜日・時期・イベントとの関係）",
    "lowAccessDays": "低アクセス日の傾向説明",
    "weekdayRanking": "曜日別アクセス傾向（例：木曜日が最も高い傾向）",
    "eventEffect": "給料日・祝日・特定日の影響があれば説明、なければ空文字"
  },
  "suggestions": [
    { "title": "提案タイトル（10文字以内）", "detail": "具体的な行動と理由（2〜3文）" }
  ],
  "urgentActions": [
    "今すぐできること（短い行動文）"
  ],
  "postingTiming": "写メ日記・SNS投稿の最適なタイミングの提案（具体的な曜日・時間帯）"
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
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
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
    logEvent("access_analysis", undefined, { period: parsed.period });
    return NextResponse.json(parsed);
  } catch (error) {
    logError("access_analysis_error", "アクセス分析APIでエラー", { message: String(error) });
    return NextResponse.json({ error: "分析中にエラーが発生しました。" }, { status: 500 });
  }
}
