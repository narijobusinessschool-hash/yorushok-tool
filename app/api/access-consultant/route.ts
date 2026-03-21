import OpenAI from "openai";
import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type AnalysisSummary = {
  period: string;
  stats: { avg: number; max: { date: string; hits: number }; prevMonthAvg?: number };
  patterns: { highAccessDays: string; lowAccessDays: string; weekdayRanking: string; vsHistory?: string };
  postingTiming: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { question, history, chatHistory } = (await req.json()) as {
      question: string;
      history: AnalysisSummary[];
      chatHistory: ChatMessage[];
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "質問を入力してください。" }, { status: 400 });
    }

    // 蓄積データをテキスト化
    const historyText =
      history.length > 0
        ? history
            .map((a) => {
              const pct =
                a.stats.prevMonthAvg && a.stats.prevMonthAvg > 0
                  ? `（前月比: ${Math.round(((a.stats.avg - a.stats.prevMonthAvg) / a.stats.prevMonthAvg) * 100)}%）`
                  : "";
              return `【${a.period}】
  平均: ${a.stats.avg}hit/日${pct}  最高: ${a.stats.max?.hits}hit（${a.stats.max?.date}）
  高アクセス日傾向: ${a.patterns.highAccessDays}
  低アクセス日傾向: ${a.patterns.lowAccessDays}
  曜日傾向: ${a.patterns.weekdayRanking}
  推奨投稿タイミング: ${a.postingTiming}`;
            })
            .join("\n\n")
        : "（まだ分析データがありません）";

    const systemPrompt = `あなたは夜職（デリヘル・ソープ・メンズエステ・セクキャバ等）で働く女性の専属AIコンサルタントです。この女性のアクセスデータを継続的に分析し、予約・指名・来店を最大化するための伴走型コンサルティングを行います。

# あなたのスタンス
- 長期的なパートナーとして、一緒に成長していく姿勢で接する
- データを根拠にした具体的なアドバイスを出す
- 過去の推移から「なぜ変化したか」を一緒に分析する
- ポジティブな変化は積極的に称え、課題は優しく指摘する
- 「次に何をすべきか」を常に明確にする
- 上から目線でなく、同じ目線で考えるパートナーとして話す
- 夜職特有の事情（指名文化・写メ日記・オキニ等）を深く理解している

# この女性のアクセスデータ（蓄積分）
${historyText}

# 応答ルール
- 日本語で、温かみのある話し言葉で回答する
- 必ずデータを根拠に話す
- 抽象的なアドバイスではなく、今日・今週できる具体的な行動を提示する
- 回答は300〜500文字程度にまとめる`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages,
    });

    const answer = response.choices[0]?.message?.content;
    if (!answer) {
      return NextResponse.json({ error: "AIから応答がありませんでした。" }, { status: 500 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    logError("consultant_error", "コンサルAPIでエラー", { message: String(error) });
    return NextResponse.json({ error: "エラーが発生しました。もう一度お試しください。" }, { status: 500 });
  }
}
