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
  mode?: "generate_body";
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

    // ユーザー自身の学習データを自動取得（承認パターン依存から脱却）
    let autoLearnedBodies: string[] = [];
    let copiedTexts: string[] = [];

    if (memberId) {
      // 高スコア添削結果を取得（スコア70以上 = 効果的な文章）
      const { data: highScoreDrafts } = await supabaseAdmin
        .from("draft_results")
        .select("improved_text, body_score, category")
        .eq("member_id", Number(memberId))
        .gte("body_score", 70)
        .order("body_score", { ascending: false })
        .limit(10);

      if (highScoreDrafts) {
        autoLearnedBodies = highScoreDrafts
          .filter((d) => d.improved_text && (!body.category || d.category === body.category))
          .map((d) => d.improved_text as string)
          .slice(0, 5);
      }

      // 実際にコピーされた文章を取得（最強の本音シグナル）
      const { data: copyEvents } = await supabaseAdmin
        .from("usage_events")
        .select("meta")
        .eq("event_type", "copy_body")
        .eq("user_id", String(memberId))
        .order("created_at", { ascending: false })
        .limit(8);

      if (copyEvents) {
        copiedTexts = copyEvents
          .map((e) => e.meta?.improvedText as string)
          .filter(Boolean)
          .slice(0, 5);
      }
    }

    // 管理者が「良い」と評価したパターンを取得（参考指針として）
    let approvedPatternSuggestions: string[] = [];
    const { data: goodPatterns } = await supabaseAdmin
      .from("usage_events")
      .select("meta")
      .eq("event_type", "pattern_suggestion")
      .eq("meta->>status", "good")
      .order("created_at", { ascending: false })
      .limit(10);
    if (goodPatterns) {
      approvedPatternSuggestions = goodPatterns.map((p) => p.meta?.pattern as string).filter(Boolean);
    }

    if (body.mode === "generate_body") {
      // Style analysis from learning examples
      const styleExamples = [
        ...(body.goodBodies ?? []).slice(0, 5),
        ...(body.learningExamples ?? []).slice(0, 3).map((e: LearningExample) => e.body),
      ].filter(Boolean);

      const styleText = styleExamples.length > 0
        ? styleExamples.map((b, i) => `【文体例${i + 1}】\n${b}`).join("\n\n")
        : "なし";

      const categoryCtx = body.category === "オキニトーク"
        ? `目的: ${body.okiniPurpose || "指定なし"}、関係性: ${body.relationshipLevel || "指定なし"}、温度感: ${body.interestLevel || "指定なし"}、相手タイプ: ${body.partnerType || "指定なし"}、送る時間帯: ${body.sendTime || "指定なし"}`
        : `狙いたい感情: ${body.emotionTarget || "指定なし"}、目的: ${body.purpose || "指定なし"}、売り別: ${body.sellType || "共通"}`;

      const diagText = body.diagnosisInfo?.typeName
        ? `診断タイプ: ${body.diagnosisInfo.typeName}\n強み: ${body.diagnosisInfo.strengths ?? ""}\nターゲット: ${body.diagnosisInfo.bestTarget ?? ""}`
        : "";

      const genSystemPrompt = `あなたは夜職業界専門のマーケティング戦略家兼トップライターです。ユーザーの過去の成功文章・実際に使われた文章・高スコア文章を総合分析し、その人らしい自然な文章をゼロから生成します。マーケティング原則（AIDA・PASONAなど）と個人の文体学習を統合して、そのまま使える完成形を出力します。`;

      const genUserPrompt = `以下のユーザーの過去の文章例を参考に、カテゴリ「${body.category ?? "写メ日記"}」の本文を1つ生成してください。
添削ではなく、ゼロから新しい文章を作成してください。

## ユーザーの文体・語尾・絵文字の癖（これを必ず踏襲すること）
${styleText}

## 生成条件
${categoryCtx}
${diagText ? `\n## 診断情報\n${diagText}` : ""}
${body.industry ? `\n## 業種\n${body.industry}` : ""}

## 指示
- 上記の文体例から語尾・絵文字・句読点の使い方・改行パターンを分析して踏襲すること
- 読んだ人が「会いに行きたい」と自然に思える文章にする
- 営業感・売り込み感を出さない
- そのままコピペして使える完成形で出力する
- JSON形式で返すこと: {"generatedBody": "<生成した本文>"}`;

      const genRes = await client.chat.completions.create({
        model,
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: genSystemPrompt },
          { role: "user", content: genUserPrompt },
        ],
      });

      const genContent = genRes.choices[0]?.message?.content ?? "{}";
      const genJson = JSON.parse(genContent);
      return NextResponse.json({ generatedBody: genJson.generatedBody ?? "" });
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

    const systemPrompt = `あなたは、夜職業界専門のマーケティング戦略家兼トップライターです。
ホスト・キャバクラ・デリヘル・ソープ・メンズエステ・風俗など夜職で働く方の写メ日記・オキニトーク・SNS投稿を、「予約・指名・来店に直結する文章」に仕上げます。
単なる文章添削ではなく、マーケティング戦略・心理学・行動経済学を統合した「伴走型プロデュース」を行います。

# あなたの5つの専門領域

## 1. 行動心理学・消費者行動
- AIDA（注意→興味→欲求→行動）を夜職文脈に最適化して適用
- 損失回避バイアス：「行かないと損」ではなく「会えない時間が続く惜しさ」で表現
- ピークエンドの法則：文章の冒頭と締めに最も感情的なピークを置く
- ザイオンス効果：繰り返し読まれる・頭に残る文章構造を作る
- 認知的不協和：「こんな子いるんだ」という小さな驚きで記憶に残す

## 2. コピーライティング理論
- PASONA法（Problem→Agitation→Solution→Offer→NarrowDown→Action）の夜職版
- ベネフィット訴求：特徴ではなく「得られる体験・感情・変化」で語る
- 具体性の法則：抽象的な「癒し」より「ここにいると力が抜ける感じ」
- ストーリーテリング：小さなエピソードで世界観を作り、読む人を引き込む
- 余白の美学：言い切らず、「続き」を想像させる行間を残す

## 3. 夜職特化・業種別マーケティング
- 各業種の顧客心理・来店動機・障壁を理解した文章設計
- 「指名」「本指名」「オキニ」それぞれのLTV（生涯価値）を高める文章
- 顧客の「来店正当化」を助ける文章（自己肯定感を高める表現）
- 競合との差別化：同じ業種でも「この子だから会いたい」を作る個性化

## 4. SNS・デジタルマーケティング
- 写メ日記：スクロールを止める冒頭設計、離脱率を下げる構成
- アルゴリズム的思考：読了率・保存率・シェア率を上げる文章
- プラットフォーム別最適化：写メ日記 / LINE / SNSで語調と構成を変える

## 5. 個人ブランディング
- 「キャラ」ではなく「人格」で認知される文章
- 継続的なファン形成：毎回読みたいと思わせる一貫したトーン
- 希少性の演出：「この人のこの時間にしかない価値」の言語化

# 夜職文章の5原則
1. **共感先行**: 最初の一文は「読んだ人の今の気持ち」に寄り添う
2. **体験で語る**: 「癒し」ではなく「ここにいると力が抜ける感じがする」
3. **自分ごと化**: 「疲れてる人へ」ではなく「疲れてる日のあなたへ」
4. **余韻と余白**: 言い切りすぎず、「続き」を想像させる
5. **自然な行動導線**: 「もしよかったら」「気になったら」で圧をかけず促す

# カテゴリ別 添削戦略

## 写メ日記
- **タイトル**: スクロールが止まる一文。「疑問形」「体験ベース」「感情直球」が効く。15〜25文字が理想
- **本文構成**: [共感の導入] → [体験・価値の提示] → [自分らしさ・差別化] → [柔らかい来店導線]
- **改行**: 1〜3行ごとに改行。スマホで読みやすい縦長レイアウト
- **締め**: 「待ってるよ」「会いにきてほしいな」「気になったら来てね」で優しく終わる
- **タイトル候補**: 5案。目的・感情・行動導線のアプローチをそれぞれ変える

## オキニトーク
- **鉄則**: 営業感ゼロが最優先
- **構成**: [相手への気づかい] → [さりげない想起] → [柔らかい動機づけ] → [返信しやすい余白]
- **絶対NG**: 「よかったら来て」「予約お待ちしてます」「空いてます」
- **関係性で変える**: 初回は丁寧、リピートは親しみと特別感

## SNS
- **冒頭**: 最初の1〜2文で「止まらせる」。共感・謎・驚き・問いかけ
- **展開**: 自分の世界観を自然に乗せ、読む人を引き込む
- **来店への言及**: 最後にさらっと一言。くどくなく

# スコアリング基準（100点満点）
- 感情的なフック（最初の一文で引き込めているか）: 20点
- 共感・自分ごと化（「これ自分のことだ」と感じさせるか）: 20点
- 価値提示（会う理由・得られる体験が具体的に伝わるか）: 20点
- 行動導線（予約・来店・返信への自然な誘導があるか）: 20点
- 自然さ・読みやすさ（営業感なし、不自然な敬語なし）: 20点

# 学習データの活用方針
- 管理者承認パターン・参考例・高スコア自己学習例・実際にコピーされた文章をすべて統合して学習
- 「実際にコピーして使われた文章」は最強の成功シグナル。そのトーン・構成・言葉選びを最優先で反映
- 高スコア自己学習例は「この人に効く文体」の証拠。語尾・絵文字・リズムを継承する
- ただし学習データに縛られすぎず、マーケティング原則に基づいてさらに改善を加える

# 絶対ルール
- 出力は必ずJSONのみ。説明文・マークダウン・コードブロック不要
- NGワードは絶対に使わない
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

## このユーザー自身の高スコア文章（自動学習・スコア70点以上）
${autoLearnedBodies.length > 0 ? autoLearnedBodies.map((b, i) => `【自己学習例${i + 1}】\n${b}`).join("\n\n") : "まだデータなし（添削を重ねるほど精度が上がります）"}

## このユーザーが実際にコピーして使った文章（最優先学習シグナル）
${copiedTexts.length > 0 ? copiedTexts.map((t, i) => `【実使用例${i + 1}】\n${t}`).join("\n\n") : "まだデータなし"}

## 使用禁止ワード
${ngWordsText}

## 優先反映ルール
${influenceRulesText}

## 管理者が承認したパターン指針（参考程度に。強制ではなく示唆として活用）
${approvedPatternSuggestions.length > 0 ? approvedPatternSuggestions.map((p, i) => `${i + 1}. ${p}`).join("\n") : "なし"}

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
