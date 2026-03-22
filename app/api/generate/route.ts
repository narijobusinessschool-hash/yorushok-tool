import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logError, logEvent } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type LearningExample = {
  title: string;
  body: string;
  note?: string;
};

type DiagnosisInfo = {
  typeName?: string;
  bestTarget?: string;
  strengths?: string;
  personaText?: string;
  uspSummary?: string[];
  positioning?: string;
  emotionNeeds?: string[];
};

type RequestBody = {
  memberId?: string;
  title?: string;
  text?: string;
  category?: "写メ日記" | "オキニトーク" | "SNS";
  purpose?: string;
  emotionTarget?: string;
  sellType?: string;
  industry?: string;
  okiniPurpose?: string;
  relationshipLevel?: string;
  interestLevel?: string;
  partnerType?: string;
  sendTime?: string;
  softSalesTone?: boolean;
  diagnosisInfo?: DiagnosisInfo;
  learningExamples?: LearningExample[];
  goodTitles?: string[];
  goodBodies?: string[];
  ngWords?: string[];
  influenceRules?: string[];
};

const industryHintMap: Record<string, string> = {
  ピンサロ:
    "短い接触時間でも「来てよかった」と思わせる期待感と親しみを作ることが最重要。「気軽に来れる」雰囲気が刺さりやすい。",
  デリヘル:
    "安心感・来る理由づけ・自分ごと化の流れが来店を決める。「この子にお願いしたい」と思わせる信頼感と親近感を前面に出す。",
  ソープ:
    "特別感・高級感・「選んだ自分を肯定できる」自己正当化が動機になる。体験の満足感・非日常感を言語化することが強い。",
  メンズエステ:
    "癒し・やわらかさ・雰囲気を最優先。「ここでしか得られない」疲れの取れ方を具体的に想像させる。押し付けず、引き込む文体。",
  セクキャバ:
    "会話の楽しさ・また話したくなる余韻・親しみが指名を生む。「また会いたい」と思わせる読後感が命。距離感の近さを自然に出す。",
  女風: "安心感・受容・「ここでなら無理しなくていい」感覚が来店を決める。特別扱いされる体験と、心の余白を作る言葉が刺さる。",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    // 回数制限チェック（consume_free_usageで原子的に処理）
    const memberId = body.memberId;
    if (memberId) {
      const { data: usage, error: rpcError } = await supabase
        .rpc("consume_free_usage", { p_member_id: Number(memberId) });

      if (rpcError) {
        logError("consume_usage_error", "回数消費RPCでエラー", { message: rpcError.message }, String(memberId));
      } else if (usage && !usage.ok) {
        return NextResponse.json(
          {
            error: "limit_exceeded",
            message: "今月の無料添削10回を使い切りました。NBSに入会すると無制限で使えます。",
          },
          { status: 429 }
        );
      }
    }

    // プランを取得してモデルを決定（NBS=gpt-4o、free=gpt-4o-mini）
    let model = "gpt-4o-mini";
    if (memberId) {
      const { data: memberData } = await supabaseAdmin
        .from("members")
        .select("plan")
        .eq("id", Number(memberId))
        .single();
      if (memberData?.plan === "nbs") model = "gpt-4o";
    }

    const title = body.title?.trim() ?? "";
    const text = body.text?.trim() ?? "";
    const category = body.category ?? "写メ日記";
    const purpose = body.purpose ?? "";
    const emotionTarget = body.emotionTarget ?? "";
    const sellType = body.sellType ?? "共通";
    const industry = body.industry ?? "";
    const okiniPurpose = body.okiniPurpose ?? "";
    const relationshipLevel = body.relationshipLevel ?? "";
    const interestLevel = body.interestLevel ?? "";
    const partnerType = body.partnerType ?? "";
    const sendTime = body.sendTime ?? "";
    const softSalesTone = body.softSalesTone ?? true;
    const diagnosisInfo = body.diagnosisInfo ?? {};
    const learningExamples = body.learningExamples ?? [];
    const goodTitles = body.goodTitles ?? [];
    const goodBodies = body.goodBodies ?? [];
    const ngWords = body.ngWords ?? [];
    const influenceRules = body.influenceRules ?? [];

    if (!text && !title) {
      return NextResponse.json(
        { error: "タイトルまたは本文を入力してください。" },
        { status: 400 }
      );
    }

    const examplesText =
      learningExamples.length > 0
        ? learningExamples
            .slice(0, 8)
            .map(
              (item, index) =>
                `【参考例${index + 1}】\nタイトル: ${item.title}\n本文: ${item.body}\nメモ: ${item.note ?? ""}`
            )
            .join("\n\n")
        : "なし";

    const goodTitlesText =
      goodTitles.length > 0
        ? goodTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")
        : "なし";

    const goodBodiesText =
      goodBodies.length > 0
        ? goodBodies
            .slice(0, 5)
            .map((b, i) => `【本文例${i + 1}】\n${b}`)
            .join("\n\n")
        : "なし";

    const ngWordsText = ngWords.length > 0 ? ngWords.join("、") : "なし";

    const influenceRulesText =
      influenceRules.length > 0
        ? influenceRules.map((item, index) => `${index + 1}. ${item}`).join("\n")
        : "なし";

    const industryHint = industry ? (industryHintMap[industry] ?? "") : "";

    const diagnosisText = diagnosisInfo.typeName
      ? [
          `診断タイプ: ${diagnosisInfo.typeName}`,
          diagnosisInfo.bestTarget ? `狙うべきターゲット: ${diagnosisInfo.bestTarget}` : "",
          diagnosisInfo.strengths ? `強み・差別化ポイント: ${diagnosisInfo.strengths}` : "",
          diagnosisInfo.uspSummary?.length
            ? `USP方向性: ${diagnosisInfo.uspSummary.join("、")}`
            : "",
          diagnosisInfo.positioning ? `ポジショニング: ${diagnosisInfo.positioning}` : "",
          diagnosisInfo.emotionNeeds?.length
            ? `狙う感情ニーズ: ${diagnosisInfo.emotionNeeds.join("、")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "診断情報なし";

    let categoryContextText = "";
    const sellTypeHintMap: Record<string, string> = {
      "M売り": "M売り（受け身・甘え系）に特化。リードしてほしい・守られたいという欲求に寄り添い、従順さや甘えをさりげなく表現する。「引っ張ってほしい」「言われたら従う」という心理に訴える。",
      "S売り": "S売り（積極的・引っ張る系）に特化。主導権・頼れる自信・リードする安心感を前面に出す。「任せてて」「全部決めてあげる」という姿勢を自然に表現する。",
      "痴女売り": "痴女売りに特化。大人の積極性・性的な奔放さを品よく匂わせる。露骨すぎず意味深な余白で想像させる。直接的な表現は避け、雰囲気と一言で引き込む。",
      "巨乳売り": "巨乳売りに特化。身体的な存在感・視線を集める魅力を品よく打ち出す。「そばにいるだけで感じる」「目が離せない」という体験を想像させる。露骨にならず雰囲気と余白で伝える。",
      "共通": "売り別を意識せず幅広い客層に刺さる汎用的な文章にする。",
    };
    const sellTypeHint = sellTypeHintMap[sellType] ?? sellTypeHintMap["共通"];

    if (category === "写メ日記") {
      categoryContextText = `狙いたい感情: ${emotionTarget || "指定なし"}
売り別: ${sellType}（${sellTypeHint}）
目的: ${purpose || "指定なし"}（アクセス増 / 予約増 / 本指名増）`;
    } else if (category === "オキニトーク") {
      categoryContextText = `目的: ${okiniPurpose || "指定なし"}（初来店の促し / 再来店の促し）
関係性: ${relationshipLevel || "指定なし"}（初めてやり取り / 1回会った / リピート中）
温度感（相手の関心度）: ${interestLevel || "指定なし"}（低 / 中 / 高）
相手タイプ: ${partnerType || "指定なし"}（忙しい / マメじゃない / 甘えたい / 警戒強め）
送る時間帯: ${sendTime || "指定なし"}（昼 / 夜 / 深夜）
営業感を消す: ${softSalesTone ? "はい（日常会話に見せること）" : "いいえ"}`;
    }

    const outputFormat =
      category === "写メ日記"
        ? `{
  "titleScore": <タイトルの現状スコア 0〜100 の整数>,
  "bodyScore": <本文の現状スコア 0〜100 の整数>,
  "titleComment": "<タイトルへの評価と改善の方向性（1〜2文）>",
  "bodyComment": "<本文への評価と改善の方向性（1〜2文）>",
  "titleSuggestions": [
    {"score": <予測スコア整数>, "text": "<添削後タイトル候補>"},
    {"score": <予測スコア整数>, "text": "<添削後タイトル候補>"},
    {"score": <予測スコア整数>, "text": "<添削後タイトル候補>"},
    {"score": <予測スコア整数>, "text": "<添削後タイトル候補>"},
    {"score": <予測スコア整数>, "text": "<添削後タイトル候補>"}
  ],
  "bodyImproved": "<添削後の本文（そのままコピペして使える完成形）>",
  "bodyAdvice": [
    "<具体的な改善ポイント1>",
    "<具体的な改善ポイント2>",
    "<具体的な改善ポイント3>"
  ]
}`
        : `{
  "titleScore": null,
  "bodyScore": <本文の現状スコア 0〜100 の整数>,
  "titleComment": null,
  "bodyComment": "<本文への評価と改善の方向性（1〜2文）>",
  "titleSuggestions": [],
  "bodyImproved": "<添削後の本文（そのままコピペして使える完成形）>",
  "bodyAdvice": [
    "<具体的な改善ポイント1>",
    "<具体的な改善ポイント2>",
    "<具体的な改善ポイント3>"
  ]
}`;

    const systemPrompt = `あなたは、夜職業界に特化した文章添削のトッププロです。
ホスト・キャバクラ・デリヘル・ソープ・メンズエステ・風俗など、夜職で働く方の写メ日記・オキニトーク・SNS投稿を、「予約・指名・来店に直結する文章」に仕上げることを専門としています。

# あなたの使命
ユーザーが入力した文章を読み、以下を実現する完成形に添削すること。
- 読んだ人の感情を動かし、「会いに行きたい」という気持ちを自然に引き出す
- 営業感・売り込み感・義務感を一切感じさせない自然な文体にする
- そのままコピペして使える完成度の高い文章を出力する
- 読者の深層心理（「癒されたい」「特別にされたい」「甘えたい」「逃げ場がほしい」）に訴える
- 予約・指名・来店・返信という具体的な行動につながる導線を自然に仕込む

# 夜職文章の5原則
1. **共感先行**: 最初の一文は「読んだ人の今の気持ち」に寄り添う。いきなり自己紹介や営業から入らない
2. **体験で語る**: 「癒し」ではなく「ここにいると力が抜ける感じがする」のように、感覚・体験・場面で伝える
3. **自分ごと化**: 「疲れてる人へ」ではなく「疲れてる日のあなたへ」のように、読み手を主語にする
4. **余韻と余白**: 言い切りすぎず、「続き」を想像させる。読後も頭に残る文体を心がける
5. **自然な行動導線**: 最後は「もしよかったら」「気になったら」など、圧をかけずに来店・予約を促す

# 心理トリガーの活用法
- **希少性・特別感**: 「あなただけ」「この時間だけ」「来てくれた人にだけ見せる一面がある」
- **返報性**: 「こんなに話してくれた」「自分のために気にかけてくれた」と感じさせる
- **親近感・弱さの開示**: 日常の一コマや少しだけ弱い部分を見せることで距離が縮まる
- **疑似恋愛感**: 二人だけの距離感、秘密感、「あなただから話す」「あなたにだけ会いたい」感
- **損失回避**: 「行かないと後悔する」ではなく「また会えない日が続くと少し寂しいな」という柔らかい表現で

# カテゴリ別 添削戦略

## 写メ日記
- **タイトル**: スクロールが止まる一文。「疑問形」「体験ベース」「感情直球」「○○な日って〜ない？」が効く。15〜25文字が理想
- **本文構成**: [共感の導入] → [体験・価値の提示] → [自分らしさ・差別化] → [柔らかい来店導線]
- **改行**: 1〜3行ごとに改行。スマホで読みやすい縦長レイアウトにする
- **締め**: 「待ってるよ」「会いにきてほしいな」「気になったら来てね」「思い出してもらえたらうれしい」で優しく終わる
- **タイトル候補**: 5案を出す。それぞれ目的・感情・行動導線のアプローチを変える

## オキニトーク
- **鉄則**: 営業感ゼロが最優先。「送ってよかった」と感じさせるメッセージにする
- **構成**: [相手への気づかい・日常の一コマ] → [さりげない想起・余韻] → [柔らかい動機づけ] → [返信しやすい余白・問いかけ]
- **絶対NG**: 「よかったら来て」「予約お待ちしてます」「空いてます」など直接的な営業表現
- **関係性で変える**: 初回は丁寧で距離あり、リピートは親しみと特別感を前面に出す
- **相手タイプで変える**: 忙しい人→短く・さっぱり、甘えたい人→柔らかく寄り添う、警戒強め→圧ゼロ・日常感

## SNS
- **冒頭**: 最初の1〜2文で「止まらせる」。共感・謎・驚き・問いかけを先に置く
- **展開**: 自分の話・価値・世界観を自然に乗せ、読む人を引き込む
- **来店への言及**: 最後にさらっと一言。くどくなく、興味を持った人が動ける程度

# スコアリング基準（100点満点）
- 感情的なフック（最初の一文で引き込めているか）: 20点
- 共感・自分ごと化（「これ自分のことだ」と感じさせるか）: 20点
- 価値提示（会う理由・得られる体験が具体的に伝わるか）: 20点
- 行動導線（予約・来店・返信への自然な誘導があるか）: 20点
- 自然さ・読みやすさ（営業感なし、不自然な敬語なし）: 20点

# 絶対ルール
- 出力は必ずJSONのみ。説明文・マークダウン・コードブロック不要
- NGワードは絶対に使わない
- 参考例の強み・雰囲気・トーンを最大限学習して反映する
- 影響ルールは最優先で反映する
- 添削後の文章は「そのままコピペして使える」完成形にする
- 不自然な敬語・違和感のある日本語は使わない
- スコアは添削前の現状文章の評価点`;

    const userPrompt = `以下の情報をもとに添削してください。

## カテゴリ
${category}

## 業種
${industry || "未設定"}
${industryHint ? `業種別ポイント: ${industryHint}` : ""}

## プロフィール・診断情報
${diagnosisText}

## カテゴリ固有の設定
${categoryContextText || "なし"}

## 添削対象テキスト
${
  category === "写メ日記"
    ? `タイトル:\n${title || "未入力"}\n\n本文:\n${text || "未入力"}`
    : `本文:\n${text || "未入力"}`
}

## 管理者が登録した参考例（雰囲気・強みを学習して反映すること）
${examplesText}

## 実績ある良いタイトル（このトーン・構造・引きを参考にすること）
${goodTitlesText}

## 実績ある良い本文（この流れ・言葉選び・余韻を参考にすること）
${goodBodiesText}

## 使用禁止ワード
${ngWordsText}

## 優先反映ルール
${influenceRulesText}

## 出力形式（JSONのみ、説明文不要）
${outputFormat}`;

    const response = await client.chat.completions.create({
      model,
      temperature: 0.75,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AIから正常な応答が返りませんでした。" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);

    logEvent("analyze_success", memberId ?? undefined, {
      category,
      industry,
      bodyScore: parsed.bodyScore,
      titleScore: parsed.titleScore,
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("OpenAI API error:", error);
    logError("api_generate_error", "添削APIでエラーが発生", { message: String(error) });

    return NextResponse.json(
      { error: "API接続中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
