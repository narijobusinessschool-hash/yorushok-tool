"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import PlanLimitModal from "@/components/PlanLimitModal";
import { gaGenerateDraft } from "@/lib/ga";

type Category = "写メ日記" | "オキニトーク" | "SNS";
type SellType = "M売り" | "S売り" | "痴女売り" | "巨乳売り" | "共通";
type OkiniPurpose = "初来店の促し" | "再来店の促し";
type RelationshipLevel = "初めてやり取り" | "1回会った" | "リピート中";
type InterestLevel = "低" | "中" | "高";
type EmotionTarget =
  | "癒し"
  | "疑似恋愛"
  | "特別感"
  | "エロさ控えめ"
  | "親しみ";
type ShameNikkiGoal = "アクセス増" | "予約増" | "本指名増";
type OkiniPartnerType = "忙しい" | "マメじゃない" | "甘えたい" | "警戒強め";
type SendTime = "昼" | "夜" | "深夜";

type TitleSuggestion = {
  score: number;
  text: string;
};

type AnalysisResult = {
  titleScore?: number;
  bodyScore: number;
  titleComment?: string;
  bodyComment: string;
  titleSuggestions?: TitleSuggestion[];
  bodyImproved: string;
  bodyAdvice: string[];
};

type SavedProfile = {
  basic: {
    character: string;
    industry: string;
    prefecture: string;
    mainGoal: string;
    priceRange: string;
    shopUrl: string;
  };
  persona: {
    ageRange: string;
    jobType: string;
    lifestyle: string[];
    visitReasons: string[];
    emotionNeeds: string[];
    worries: string[];
    triggers: string[];
    tone: string[];
    sources: string[];
    decisionPoints: string[];
  };
  usp: {
    impressions: string[];
    strengthStyles: string[];
    repeatReasons: string[];
    summary: string[];
  };
  stp: {
    segment: string;
    target: string;
    positioning: string;
  };
  diagnosis: {
    typeName: string;
    bestTarget: string;
    strengths: string;
    personaText: string;
  };
  updatedAt: string;
};

type SavedDraftResult = {
  id: string;
  createdAt: string;
  category: Category;
  title: string;
  originalText: string;
  improvedText: string;
  titleScore?: number;
  bodyScore: number;
  profileTypeName: string;
  industry: string;
  prefecture: string;
  purpose?: string;
  status: "下書き" | "使用済み";
};

type DraftOutcome = {
  used: "使った" | "使ってない";
  reservation: "あり" | "なし";
  nomination: "あり" | "なし";
  visit: "あり" | "なし";
  memo: string;
  updatedAt: string;
};

type OutcomeMap = Record<string, DraftOutcome>;
type ApprovedPatternMap = Record<string, boolean>;

type SuccessInsight = {
  totalSuccess: number;
  matchedSuccess: number;
  approvedMatches: string[];
  topIndustry: string;
  topCategory: string;
  topPurpose: string;
  topScoreBand: string;
  successRateText: string;
};

const baseTitleTemplateMap: Record<
  EmotionTarget,
  Record<ShameNikkiGoal, string[]>
> = {
  癒し: {
    アクセス増: [
      "疲れてる日って、ちゃんと癒されたいよね",
      "なんとなくしんどい日に、少しだけ癒されにきて",
      "ちゃんと落ち着ける時間、欲しくない？",
      "何も考えずにいられる時間、ここにあるよ",
      "癒されたい気分の日、思い出してほしい",
    ],
    予約増: [
      "疲れてる日こそ、ちゃんと癒されにきて",
      "少しでも癒されたいなら、会いにきてね",
      "落ち着ける時間がほしい日に、思い出してほしい",
      "頑張りすぎた日に、少し休みにきて",
      "やさしく癒されたい夜、ない？",
    ],
    本指名増: [
      "また会いたいって思える癒し、ここにあるよ",
      "ちゃんと落ち着ける時間、また感じにきて",
      "忘れられないくらい癒される時間にしたい",
      "また会いたくなるやさしさ、用意してるよ",
      "次も会いたいって思わせる癒し方、知ってるよ",
    ],
  },
  疑似恋愛: {
    アクセス増: [
      "少し甘えたい夜って、誰かに会いたくならない？",
      "恋人みたいに過ごせる時間、たまにはどう？",
      "そばにいたくなる時間って、やっぱり特別だよね",
      "会いたいって思う夜、ちゃんとあるよね",
      "少しだけ恋人みたいな時間、感じてみない？",
    ],
    予約増: [
      "少し甘えたい夜なら、会いにきてね",
      "恋人みたいに過ごしたい気分の日、ない？",
      "会いたくなったら、その気持ちのままで来てね",
      "甘えたくなる夜に、ちゃんと寄り添うよ",
      "ひとりでいたくない夜、会いにきてほしいな",
    ],
    本指名増: [
      "また会いたいって思わせる夜にするね",
      "恋人みたいな時間、また感じにきて",
      "忘れられない距離感、ちゃんと作るよ",
      "また会いたくなる理由、ちゃんとあるよ",
      "次も会いたいって思う夜にしたいな",
    ],
  },
  特別感: {
    アクセス増: [
      "ただの時間じゃなくて、特別な時間にしたい",
      "ここでしか感じられない時間、作りたいな",
      "来てくれた人だけに見せる一面があるよ",
      "少しだけ特別な夜にしてみない？",
      "あなただけに感じてほしい時間、用意してるよ",
    ],
    予約増: [
      "少しだけ特別な時間、会いにきて感じてほしい",
      "ただ会うだけじゃない夜、過ごしにきてね",
      "あなたにだけ見せたい時間があるよ",
      "特別な気分になりたい日、会いにきて",
      "来てよかったって思える特別感、ちゃんとあるよ",
    ],
    本指名増: [
      "また会いたいって思う特別な時間にするね",
      "忘れられない特別感、また感じにきて",
      "あなただけって思わせる時間、ちゃんと作るよ",
      "次も会いたいって思える夜にしたい",
      "特別だったって思ってもらえる時間を約束するね",
    ],
  },
  エロさ控えめ: {
    アクセス増: [
      "少しだけ距離が近い時間って、なんか落ち着くよね",
      "やわらかい空気の中で、ゆっくり過ごしたいな",
      "無理しない距離感で、ちゃんと癒される時間を",
      "大人っぽい落ち着いた時間、好きな人へ",
      "ゆっくり近づいていく時間、嫌いじゃないよね？",
    ],
    予約増: [
      "やわらかい空気の時間、会いにきて感じてほしい",
      "落ち着いた距離感が好きなら、会いにきてね",
      "少しだけ近い時間、過ごしにきてみない？",
      "大人っぽく落ち着いた時間、ちゃんと作るよ",
      "無理しない空気感で会いたい日に、思い出してほしい",
    ],
    本指名増: [
      "また会いたいって思う距離感、ちゃんと作るよ",
      "やわらかく近づく時間、また感じにきて",
      "忘れられない空気感、また会って確かめてね",
      "次も会いたいって思う落ち着き、ここにあるよ",
      "何度でも会いたくなるやさしい距離感にしたいな",
    ],
  },
  親しみ: {
    アクセス増: [
      "気を使わずに会える時間って、大事だったりするよね",
      "ふらっと会いにこれるくらいがちょうどいいよね",
      "ちょっと話したいなって時に、思い出してほしい",
      "気楽に会える場所、ここにあるよ",
      "いつもの感じで、ゆるく会えたらうれしいな",
    ],
    予約増: [
      "気楽に会いたい日に、ふらっと来てね",
      "頑張らずに会える時間、ちゃんと作るよ",
      "少し話したい気分の日、会いにきてね",
      "いつもの感じで会える時間、過ごしにきて",
      "肩の力を抜いて会いたい日に、思い出してほしい",
    ],
    本指名増: [
      "また会いたいって思える気楽さ、ちゃんとあるよ",
      "いつもの感じで、また会えたらうれしいな",
      "何回でも会いたくなる居心地を作るね",
      "また来たくなるくらい自然な時間にしたいな",
      "次も会いたいって思える安心感、ここにあるよ",
    ],
  },
};

const industryHints: Record<string, string> = {
  ピンサロ: "短い接触時間でも期待感と親しみを作る表現が強いです。",
  デリヘル: "安心感・会う理由・自分ごと化の流れが重要です。",
  ソープ: "特別感・高級感・満足感の言語化が強いです。",
  メンズエステ: "癒し・雰囲気・やわらかさを前面に出すと刺さりやすいです。",
  セクキャバ: "会話の楽しさ・親しみ・また会いたくなる余韻が重要です。",
  女風: "安心感・受容・相手理解・特別扱いが強いです。",
};

const industrySpecificTitleMap: Record<
  string,
  Partial<Record<EmotionTarget, string[]>>
> = {
  ピンサロ: {
    親しみ: [
      "気軽に会いたい日に、思い出してほしい",
      "少しだけ気分を変えたい日にどう？",
      "ふらっと会いたくなる空気、ここにあるよ",
    ],
    特別感: [
      "短い時間でも、ちゃんと印象に残したい",
      "少しだけ特別な気分になりたい日に",
      "来てよかったって思える時間にするね",
    ],
  },
  デリヘル: {
    癒し: [
      "疲れてる日に、ちゃんと癒される時間を",
      "会う理由がほしくなる夜ってない？",
      "ただ会うだけじゃない時間、過ごしにきて",
    ],
    疑似恋愛: [
      "少し甘えたい夜なら、会いにきてね",
      "ひとりでいたくない夜ってあるよね",
      "恋人みたいな空気、ちゃんと作るよ",
    ],
  },
  ソープ: {
    特別感: [
      "ただ会うだけじゃない、満たされる時間を",
      "特別な夜にしたいなら、思い出してほしい",
      "満足感までちゃんと残る時間にするね",
    ],
    エロさ控えめ: [
      "大人っぽい余裕のある時間、好きな人へ",
      "落ち着いた空気で、ちゃんと満たされたい日に",
      "やわらかく深く残る時間にしたいな",
    ],
  },
  メンズエステ: {
    癒し: [
      "ちゃんと力を抜ける時間、欲しくない？",
      "頑張りすぎた日に、思い出してほしい",
      "癒されたい気分の夜に、そっと寄り添いたい",
    ],
    親しみ: [
      "気を使わずに休める時間、ここにあるよ",
      "ゆるく会えて、ちゃんと癒される時間を",
      "ふっと力を抜きたい日に、会いにきてね",
    ],
  },
  セクキャバ: {
    親しみ: [
      "また話したいなって思える夜ってあるよね",
      "楽しく話したい日に、思い出してほしい",
      "また会いたくなる空気、ちゃんと作るよ",
    ],
    疑似恋愛: [
      "会話も距離感も、ちょうどよく近づきたい",
      "また会いたくなる余韻、残したいな",
      "少しだけ特別に感じる夜、作るよ",
    ],
  },
  女風: {
    特別感: [
      "あなたの気持ちを大事にする時間にしたい",
      "ただ会うだけじゃない、満たされる夜を",
      "特別に扱われたい日に、思い出してほしい",
    ],
  },
};

const sellTypeTitleMap: Record<SellType, string[]> = {
  "M売り": [
    "言われるまま、甘えていいですか？",
    "今日だけ、ワガママ聞いてほしいな",
    "リードしてくれる人って、なんか安心する",
    "強い人の隣にいると、力が抜けるよね",
    "引っ張ってくれるだけで、それだけでいいの",
    "甘えさせてくれる人のそばにいたい",
  ],
  "S売り": [
    "今日くらい、私に任せてみて？",
    "引っ張られる夜って、たまにいいよね",
    "リードされたい夜、ない？",
    "私が全部決めていい日にしてあげる",
    "少しだけ、主導権こっちにちょうだい",
    "大人しくしてたら、ちゃんと満たしてあげる",
  ],
  "痴女売り": [
    "あなたのこと、もっと知りたくて",
    "少しだけ大人の時間、どう？",
    "気になってることがあるの、話してもいい？",
    "大人な時間って、やっぱり特別だよね",
    "あなたと過ごす夜、想像したことある？",
    "正直に言うと、会いたいって思ってた",
  ],
  "巨乳売り": [
    "視線感じてるの、気づいてる？",
    "この感じ、ちゃんと伝わってる？",
    "近くにいると、ちょっと落ち着く？",
    "存在感って、言葉より先に伝わるよね",
    "ちゃんと見てほしいものがあるの",
    "そばにいるだけで、なんか安心してほしいな",
  ],
  "共通": [
    "少しだけ気分を変えたい日に思い出してほしい",
    "ちゃんと満たされる時間、欲しくない？",
    "会ってよかったって思える夜にしたい",
    "また来たくなる理由、ちゃんとあるよ",
    "今日の気分に合う時間、ここにあるよ",
  ],
};

const sellTypeBodyHint: Record<SellType, string> = {
  "M売り": "M売り（受け身・甘え系）に特化した文章。リードしてほしい・守られたいという気持ちに寄り添い、従順さや甘えをさりげなく出す。「言われたら従う」「引っ張ってほしい」という心理に訴える。",
  "S売り": "S売り（積極的・引っ張る系）に特化した文章。主導権を持ち、相手をリードする安心感・頼れる存在感を前面に出す。「任せてて」「全部決めてあげる」という姿勢で自信を見せる。",
  "痴女売り": "痴女売りに特化した文章。大人の積極性・性的な奔放さを品よく匂わせる。露骨すぎず、でも想像させる余白を持たせた表現にする。直接的な言葉は避け、意味深な一言で引き込む。",
  "巨乳売り": "巨乳売りに特化した文章。身体的な存在感・視線を集める魅力を品よく打ち出す。「そばにいるだけで感じる」「目が離せない」という体験を想像させる表現を使う。露骨にならず、雰囲気と余白で伝える。",
  "共通": "売り別を意識せず、幅広い客層に刺さる汎用的な文章。癒し・親しみ・特別感を自然にブレンドする。",
};

function getProfileEmotion(profile: SavedProfile | null): EmotionTarget | null {
  if (!profile) return null;
  if (profile.persona.emotionNeeds.includes("癒し")) return "癒し";
  if (profile.persona.emotionNeeds.includes("疑似恋愛")) return "疑似恋愛";
  if (profile.persona.emotionNeeds.includes("特別感")) return "特別感";
  if (profile.persona.emotionNeeds.includes("親しみ")) return "親しみ";
  return null;
}

function getProfileGoal(profile: SavedProfile | null): ShameNikkiGoal | null {
  if (!profile) return null;
  if (profile.basic.mainGoal === "アクセス増") return "アクセス増";
  if (profile.basic.mainGoal === "予約増") return "予約増";
  return "本指名増";
}

async function saveDraftResult(item: SavedDraftResult, memberId: string) {
  await supabase.from("draft_results").insert({
    id: item.id,
    member_id: memberId,
    created_at: item.createdAt,
    category: item.category,
    title: item.title,
    original_text: item.originalText,
    improved_text: item.improvedText,
    title_score: item.titleScore ?? null,
    body_score: item.bodyScore,
    profile_type_name: item.profileTypeName,
    industry: item.industry,
    prefecture: item.prefecture,
    purpose: item.purpose ?? "",
    status: item.status,
  });
}

function getScoreBand(score: number) {
  if (score >= 90) return "90点以上";
  if (score >= 80) return "80〜89点";
  if (score >= 70) return "70〜79点";
  if (score >= 60) return "60〜69点";
  return "60点未満";
}

function getTop(map: Record<string, number>) {
  const entry = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
  return entry ? entry[0] : "まだデータなし";
}

function buildSuccessInsight(args: {
  drafts: SavedDraftResult[];
  outcomes: OutcomeMap;
  approvedPatterns: ApprovedPatternMap;
  industry: string;
  category: Category;
  purpose: string;
}): SuccessInsight {
  const { drafts, outcomes, approvedPatterns, industry, category, purpose } = args;

  const merged = drafts
    .map((draft) => ({
      ...draft,
      outcome: outcomes[draft.id],
    }))
    .filter((item) => item.outcome);

  const successItems = merged.filter(
    (item) =>
      item.outcome?.used === "使った" &&
      (item.outcome?.reservation === "あり" ||
        item.outcome?.nomination === "あり" ||
        item.outcome?.visit === "あり")
  );

  const matched = successItems.filter(
    (item) =>
      item.category === category &&
      (industry ? item.industry === industry : true) &&
      (purpose ? item.purpose === purpose : true)
  );

  const approvedMatches: string[] = [];

  if (approvedPatterns[`industry:${industry}`]) approvedMatches.push(`業種:${industry}`);
  if (approvedPatterns[`category:${category}`]) approvedMatches.push(`カテゴリ:${category}`);
  if (approvedPatterns[`purpose:${purpose}`]) approvedMatches.push(`目的:${purpose}`);

  const industryMap = buildSimpleMap(successItems.map((item) => item.industry || "未設定"));
  const categoryMap = buildSimpleMap(successItems.map((item) => item.category || "未設定"));
  const purposeMap = buildSimpleMap(successItems.map((item) => item.purpose || "未設定"));
  const scoreBandMap = buildSimpleMap(successItems.map((item) => getScoreBand(item.bodyScore)));

  return {
    totalSuccess: successItems.length,
    matchedSuccess: matched.length,
    approvedMatches,
    topIndustry: getTop(industryMap),
    topCategory: getTop(categoryMap),
    topPurpose: getTop(purposeMap),
    topScoreBand: getTop(scoreBandMap),
    successRateText:
      matched.length > 0
        ? `現在の条件に近い成功データが ${matched.length} 件あります`
        : successItems.length > 0
        ? `近い条件の成功データはまだ少ないですが、全体成功データは ${successItems.length} 件あります`
        : "まだ成功データがありません",
  };
}

function buildSimpleMap(items: string[]) {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    if (!item) return;
    map[item] = (map[item] || 0) + 1;
  });
  return map;
}

export default function NewPostPage() {
  const [category, setCategory] = useState<Category>("写メ日記");

  const [title, setTitle] = useState("");
  const [emotionTarget, setEmotionTarget] = useState<EmotionTarget | "">("");
  const [shameNikkiGoal, setShameNikkiGoal] =
    useState<ShameNikkiGoal | "">("");
  const [sellType, setSellType] = useState<SellType | "">("");

  const [text, setText] = useState("");

  const [okiniPurpose, setOkiniPurpose] =
    useState<OkiniPurpose | "">("");
  const [relationshipLevel, setRelationshipLevel] =
    useState<RelationshipLevel | "">("");
  const [interestLevel, setInterestLevel] = useState<InterestLevel | "">("");
  const [softSalesTone, setSoftSalesTone] = useState(true);
  const [partnerType, setPartnerType] = useState<OkiniPartnerType | "">("");
  const [sendTime, setSendTime] = useState<SendTime | "">("");

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedKey, setCopiedKey] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [savedNotice, setSavedNotice] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingBody, setIsGeneratingBody] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [generatedTitleOptions, setGeneratedTitleOptions] = useState<TitleSuggestion[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showUsabilityFeedback, setShowUsabilityFeedback] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<"使う予定" | "たぶん使う" | "使わない" | null>(null);
  const [showFeedbackReason, setShowFeedbackReason] = useState(false);
  const [lastCopiedResultId, setLastCopiedResultId] = useState<string | null>(null);
  const [lastCopiedText, setLastCopiedText] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<SavedDraftResult[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});
  const [approvedPatterns, setApprovedPatterns] = useState<ApprovedPatternMap>({});

  useEffect(() => {
    async function loadAll() {
      const rawUser = localStorage.getItem("yorushokuCurrentUser");
      const currentUser = rawUser ? JSON.parse(rawUser) : null;

      // プロフィール読み込み
      if (currentUser) {
        const { data: profileData } = await supabase
          .from("member_profiles")
          .select("profile_data")
          .eq("member_id", currentUser.id)
          .single();

        if (profileData?.profile_data) {
          const parsed = profileData.profile_data as SavedProfile;
          setProfile(parsed);
        } else {
          const saved = localStorage.getItem("yorushokuPersonaProfile");
          if (saved) {
            const parsed = JSON.parse(saved) as SavedProfile;
            setProfile(parsed);
          }
        }

        // 添削履歴読み込み（Supabase優先・localStorage移行）
        const { data: supabaseDrafts } = await supabase
          .from("draft_results")
          .select("*")
          .eq("member_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (supabaseDrafts && supabaseDrafts.length > 0) {
          const mapped: SavedDraftResult[] = supabaseDrafts.map((d) => ({
            id: d.id,
            createdAt: d.created_at,
            category: d.category as Category,
            title: d.title,
            originalText: d.original_text,
            improvedText: d.improved_text,
            titleScore: d.title_score ?? undefined,
            bodyScore: d.body_score,
            profileTypeName: d.profile_type_name,
            industry: d.industry,
            prefecture: d.prefecture,
            purpose: d.purpose,
            status: d.status as "下書き" | "使用済み",
          }));
          setDrafts(mapped);

          // 成果記録も読み込み
          const { data: supabaseOutcomes } = await supabase
            .from("draft_outcomes")
            .select("*")
            .eq("member_id", currentUser.id);
          if (supabaseOutcomes) {
            const map: OutcomeMap = {};
            supabaseOutcomes.forEach((o) => {
              map[o.draft_id] = {
                used: o.used,
                reservation: o.reservation,
                nomination: o.nomination,
                visit: o.visit,
                memo: o.memo,
                updatedAt: o.updated_at,
              };
            });
            setOutcomes(map);
          }
        } else {
          // localStorageから移行
          const rawDrafts = localStorage.getItem("yorushokuDraftResults");
          if (rawDrafts) {
            const localDrafts: SavedDraftResult[] = JSON.parse(rawDrafts);
            setDrafts(localDrafts);
            for (const draft of localDrafts) {
              await saveDraftResult(draft, currentUser.id);
            }
          }
          const rawOutcomes = localStorage.getItem("yorushokuDraftOutcomes");
          if (rawOutcomes) setOutcomes(JSON.parse(rawOutcomes));
        }
      }

      const rawApproved = localStorage.getItem("yorushokuApprovedPatterns");
      if (rawApproved) setApprovedPatterns(JSON.parse(rawApproved));
    }

    loadAll();
  }, []);

  const canAnalyze = useMemo(() => {
    if (category === "写メ日記") {
      return title.trim().length > 0 || text.trim().length > 0;
    }
    return text.trim().length > 0;
  }, [category, title, text]);

  const currentPurpose =
    category === "写メ日記" ? shameNikkiGoal : category === "オキニトーク" ? okiniPurpose : "SNS";

  const successInsight = useMemo(() => {
    return buildSuccessInsight({
      drafts,
      outcomes,
      approvedPatterns,
      industry: profile?.basic.industry || "",
      category,
      purpose: currentPurpose,
    });
  }, [drafts, outcomes, approvedPatterns, profile?.basic.industry, category, currentPurpose]);

  const copyText = async (value: string, key: string, isBodyResult = false) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1600);

      if (isBodyResult) {
        // コピーイベントを記録（本音ログ）
        const rawUser = localStorage.getItem("yorushokuCurrentUser");
        const currentUser = rawUser ? JSON.parse(rawUser) : null;
        const resultId = result ? (result as AnalysisResult & { id?: string }).id : null;
        setLastCopiedResultId(resultId ?? null);
        setLastCopiedText(value);
        fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: currentUser?.id,
            draftResultId: resultId,
            eventType: "copy",
            improvedText: value,
            category,
          }),
        }).catch(() => {});

        // 3秒後にトーストを表示
        setTimeout(() => {
          setShowFeedbackToast(true);
          setFeedbackRating(null);
          setShowFeedbackReason(false);
        }, 3000);
      }
    } catch {
      setCopiedKey("");
    }
  };

  function triggerUsabilityFeedbackIfNeeded() {
    const key = "yorushokuCompletionCount";
    const count = parseInt(localStorage.getItem(key) ?? "0", 10) + 1;
    localStorage.setItem(key, String(count));
    if (count % 5 === 0) {
      setTimeout(() => setShowUsabilityFeedback(true), 800);
    }
  }

  async function handleUsabilityFeedback(rating: "使える" | "使えない") {
    const raw = localStorage.getItem("yorushokuCurrentUser");
    const memberId = raw ? JSON.parse(raw).id : null;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, rating, eventType: "usability_feedback", category }),
    }).catch(() => {});
    setShowUsabilityFeedback(false);
  }

  const handleFeedbackRating = async (rating: "使う予定" | "たぶん使う" | "使わない") => {
    setFeedbackRating(rating);
    const rawUser = localStorage.getItem("yorushokuCurrentUser");
    const currentUser = rawUser ? JSON.parse(rawUser) : null;

    if (rating === "使わない") {
      setShowFeedbackReason(true);
      return;
    }

    // 理由不要の場合はそのまま送信
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: currentUser?.id,
        draftResultId: lastCopiedResultId,
        rating,
        eventType: "feedback",
        improvedText: lastCopiedText,
        category,
      }),
    }).catch(() => {});

    setTimeout(() => setShowFeedbackToast(false), 1500);
  };

  const handleFeedbackReason = async (reason: string) => {
    const rawUser = localStorage.getItem("yorushokuCurrentUser");
    const currentUser = rawUser ? JSON.parse(rawUser) : null;

    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: currentUser?.id,
        draftResultId: lastCopiedResultId,
        rating: "使わない",
        reason,
        eventType: "feedback",
        improvedText: lastCopiedText,
        category,
      }),
    }).catch(() => {});

    setShowFeedbackToast(false);
  };

  function calculateTitleScore(value: string) {
    let score = 45;
    if (value.length >= 8 && value.length <= 32) score += 15;
    if (/[？?！!]/.test(value)) score += 10;
    if (
      value.includes("甘え") ||
      value.includes("癒し") ||
      value.includes("疲れ") ||
      value.includes("会いたい") ||
      value.includes("夜") ||
      value.includes("特別") ||
      value.includes("落ち着") ||
      value.includes("満た")
    ) {
      score += 15;
    }
    if (
      value.includes("ない？") ||
      value.includes("したい") ||
      value.includes("きて") ||
      value.includes("ほしい") ||
      value.includes("思い出して") ||
      value.includes("どう？")
    ) {
      score += 10;
    }
    if (value.trim().length === 0) score = 0;
    return Math.min(score, 100);
  }

  function calculateBodyScore(value: string, selectedCategory: Category) {
    let score = 40;
    if (value.length >= 60) score += 15;

    if (selectedCategory === "写メ日記") {
      if (
        value.includes("疲れ") ||
        value.includes("癒し") ||
        value.includes("甘え") ||
        value.includes("寂しい") ||
        value.includes("落ち着") ||
        value.includes("特別")
      ) score += 15;
      if (
        value.includes("会いに") ||
        value.includes("来て") ||
        value.includes("気になったら") ||
        value.includes("待ってる") ||
        value.includes("思い出して")
      ) score += 15;
    }

    if (selectedCategory === "オキニトーク") {
      if (
        value.includes("無理しないで") ||
        value.includes("おつかれさま") ||
        value.includes("元気") ||
        value.includes("最近") ||
        value.includes("気になって")
      ) score += 15;
      if (
        value.includes("また") ||
        value.includes("もしよかったら") ||
        value.includes("タイミング") ||
        value.includes("会えたら")
      ) score += 15;
    }

    if (selectedCategory === "SNS") {
      if (
        value.includes("共感") ||
        value.includes("疲れ") ||
        value.includes("夜") ||
        value.includes("気分")
      ) score += 15;
      if (
        value.includes("気になったら") ||
        value.includes("思い出して") ||
        value.includes("見てね")
      ) score += 15;
    }

    if (
      value.includes("ただ") ||
      value.includes("ちゃんと") ||
      value.includes("少しでも")
    ) score += 10;

    if (value.trim().length === 0) score = 0;
    return Math.min(score, 100);
  }

  function getTitleTemplates(emotion: EmotionTarget, goal: ShameNikkiGoal) {
    const base = baseTitleTemplateMap[emotion][goal];
    const industry = profile?.basic.industry || "";
    const industrySpecific = industrySpecificTitleMap[industry]?.[emotion] || [];

    const positioningAdditions =
      profile?.stp.positioning === "安心感寄り"
        ? ["安心して会える時間、ちゃんとあるよ", "無理しなくていい時間、ここにあるよ"]
        : profile?.stp.positioning === "特別感寄り"
        ? ["あなただけに感じてほしい時間にしたい", "特別って思える夜、作りたいな"]
        : profile?.stp.positioning === "親しみ寄り"
        ? ["気楽に会える感じが、ちょうどいいよね", "ふっと思い出した時に、会いにきて"]
        : [];

    const successBoost =
      approvedPatterns[`purpose:${goal}`]
        ? [
            "今の気分にちゃんと刺さる時間、作りたいな",
            "少しでも気になったなら、思い出してほしい",
          ]
        : [];

    const sellTypeAdditions = sellType && sellType !== "共通" ? sellTypeTitleMap[sellType as SellType] : [];

    return [...successBoost, ...sellTypeAdditions, ...industrySpecific, ...positioningAdditions, ...base];
  }

  function generateAiTitle() {
    const templates = getTitleTemplates(emotionTarget as EmotionTarget || "癒し", shameNikkiGoal as ShameNikkiGoal || "アクセス増");
    const selected =
      templates[Math.floor(Math.random() * templates.length)] ||
      "少し甘えたい夜って、誰かに会いたくならない？";

    setGeneratedTitle(selected);
    setTitle(selected);
  }

  function buildTitleSuggestions() {
    const templates = getTitleTemplates(emotionTarget as EmotionTarget || "癒し", shameNikkiGoal as ShameNikkiGoal || "アクセス増");
    const unique = Array.from(new Set(templates));

    const scored = unique.map((item) => {
      let score = calculateTitleScore(item);

      if (approvedPatterns[`purpose:${shameNikkiGoal}`]) score += 3;
      if (approvedPatterns[`industry:${profile?.basic.industry || ""}`]) score += 3;
      if (
        profile?.basic.industry &&
        emotionTarget && industrySpecificTitleMap[profile.basic.industry]?.[emotionTarget as EmotionTarget]?.includes(item)
      ) {
        score += 4;
      }
      if (approvedPatterns[`scoreBand:80〜89点`] || approvedPatterns[`scoreBand:90点以上`]) {
        score += 2;
      }

      return { text: item, score: Math.min(score, 100) };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  function buildIndustryOpening() {
    const industry = profile?.basic.industry || "";

    if (industry === "メンズエステ") return "頑張りすぎた日に、ちゃんと力を抜ける時間って大事だよね。";
    if (industry === "ソープ") return "ただ会うだけじゃなくて、満たされる時間がほしい日ってない？";
    if (industry === "デリヘル") return "疲れてる日って、ちゃんと会う理由がほしくならない？";
    if (industry === "セクキャバ") return "また話したいなって思える時間って、やっぱり特別だよね。";
    if (industry === "ピンサロ") return "少しだけ気分を変えたい日に、思い出してほしいな。";
    if (industry === "女風") return "無理しないで甘えられる時間って、ちゃんと必要だよね。";

    return "";
  }

  function buildShameNikkiImprovedBody(value: string) {
    const trimmed = value.trim();
    const industryLead = buildIndustryOpening();

    const emotionLead =
      emotionTarget === "癒し"
        ? "疲れてる日って、ちゃんと癒される時間がほしくならない？"
        : emotionTarget === "疑似恋愛"
        ? "少し甘えたい日って、誰かに会いたくならない？"
        : emotionTarget === "特別感"
        ? "ただ会うだけじゃなくて、特別な時間がほしい日ってない？"
        : emotionTarget === "エロさ控えめ"
        ? "少しだけ距離が近い時間って、なんだか落ち着くよね。"
        : "気を使わずにいられる時間って、大事だったりするよね。";

    const goalLine =
      shameNikkiGoal === "アクセス増"
        ? "なんとなく気になった時に、思い出してもらえる存在でいたいです。"
        : shameNikkiGoal === "予約増"
        ? "少しでも気になったら、会いにきてもらえたらうれしいです。"
        : "また会いたいって思ってもらえる時間にしたいです。";

    const positioningLine =
      profile?.stp.positioning === "安心感寄り"
        ? "無理に盛るより、安心して会える空気を大事にしたいです。"
        : profile?.stp.positioning === "特別感寄り"
        ? "来てくれた人にだけ感じてもらえる特別感をちゃんと作りたいです。"
        : profile?.stp.positioning === "親しみ寄り"
        ? "気楽なのに印象に残る、そんな時間にしたいです。"
        : "";

    const uspLine =
      profile?.usp.summary.includes("癒し特化")
        ? "ちゃんと癒されたって思ってもらえる時間を意識しています。"
        : profile?.usp.summary.includes("疑似恋愛特化")
        ? "距離感が近く感じられる時間を大事にしています。"
        : profile?.usp.summary.includes("特別感特化")
        ? "会った人だけが感じられる特別さを大事にしています。"
        : profile?.usp.summary.includes("親しみやすさ特化")
        ? "気を使いすぎずに話せる空気を大事にしています。"
        : "";

    const successLine =
      successInsight.approvedMatches.length > 0
        ? `承認済みの成功パターン（${successInsight.approvedMatches.join(" / ")}）を反映しています。`
        : "";

    return `${industryLead || emotionLead}
${trimmed || emotionLead}
ただ時間を過ごすだけじゃなくて、ちゃんと気持ちがやわらぐ時間にしたいです。
${positioningLine}
${uspLine}
${successLine}
${goalLine}`.replace(/\n{2,}/g, "\n");
  }

  function buildOkiniTalkImprovedBody(
    value: string,
    purpose: OkiniPurpose,
    relationship: RelationshipLevel,
    interest: InterestLevel,
    softTone: boolean,
    partner: OkiniPartnerType,
    timing: SendTime
  ) {
    const timeLead =
      timing === "昼"
        ? "お昼のタイミングで少しだけ。"
        : timing === "夜"
        ? "夜だからこそ、ふと思い出して送ってみました。"
        : "遅い時間にごめんね。少しだけ気持ちを伝えたくて。";

    const relationLead =
      relationship === "初めてやり取り"
        ? "はじめまして。急に重くならないように、やわらかく送ります。"
        : relationship === "1回会った"
        ? "この前はありがとう。ふと、また思い出してました。"
        : "いつもありがとう。最近どうしてるかなって気になってました。";

    const partnerLead =
      partner === "忙しい"
        ? "忙しいと、ちゃんと休む時間って後回しになりがちだよね。"
        : partner === "マメじゃない"
        ? "返信とか気を使わなくて大丈夫だから、気が向いた時だけでうれしいです。"
        : partner === "甘えたい"
        ? "少し甘えたくなる日って、急に来たりするよね。"
        : "最初は少し警戒しちゃうタイプでも、無理しなくて大丈夫です。";

    const purposeLine =
      purpose === "初来店の促し"
        ? "もし少しでも気になってくれてるなら、緊張しすぎずに来てもらえたらうれしいです。"
        : "またタイミングが合う時に、前みたいにゆっくり会えたらうれしいなって思ってます。";

    const temperatureLine =
      interest === "低"
        ? "無理にとは思ってないから、ほんの少しでも気になった時に思い出してもらえたら十分です。"
        : interest === "中"
        ? "気分が合う時があれば、またやり取りできたらうれしいです。"
        : "また会えたらうれしいなって素直に思ってるので、タイミング合えば連絡ください。";

    const industryLine =
      profile?.basic.industry === "女風"
        ? "安心して話せる相手でいたいと思ってます。"
        : profile?.basic.industry === "メンズエステ"
        ? "無理せず力を抜ける時間になれたらうれしいです。"
        : profile?.basic.industry === "セクキャバ"
        ? "また話したいって思ってもらえたらうれしいです。"
        : "";

    const successLine =
      successInsight.approvedMatches.length > 0
        ? `承認済みの成功パターン（${successInsight.approvedMatches.join(" / ")}）を反映しています。`
        : "";

    const toneAdjust = softSalesTone
      ? "営業っぽくはしたくないから、気持ちだけそっと伝えておきます。"
      : "会えたらうれしい気持ちがちゃんとあるので、素直に送ってます。";

    const custom = value.trim() ? ` ${value.trim()}` : "";

    return `${timeLead}
${relationLead}
${partnerLead}${custom}
${industryLine}
${successLine}
${purposeLine}
${temperatureLine}
${toneAdjust}`.replace(/\n{2,}/g, "\n");
  }

  function buildSnsImprovedBody(value: string) {
    const trimmed = value.trim();
    const industryLead = buildIndustryOpening();
    const successLine =
      successInsight.approvedMatches.length > 0
        ? `承認済みの成功パターン（${successInsight.approvedMatches.join(" / ")}）を反映しています。`
        : "";

    return `${industryLead || "なんとなく満たされない日ってない？"}
${trimmed || "ちゃんと癒される時間があるだけで、気持ちって少し軽くなるよね。"}
${successLine}
少しでも気持ちがやわらぐ時間になれたらうれしいです。`.replace(/\n{2,}/g, "\n");
  }

  function buildAdvice(selectedCategory: Category) {
    const commonIndustryAdvice =
      profile?.basic.industry === "メンズエステ"
        ? "メンズエステは癒し・空気感・力を抜ける印象を優先すると強いです。"
        : profile?.basic.industry === "ソープ"
        ? "ソープは特別感・満足感・高級感を言語化すると強いです。"
        : profile?.basic.industry === "デリヘル"
        ? "デリヘルは安心感と会う理由の明確化が重要です。"
        : profile?.basic.industry === "セクキャバ"
        ? "セクキャバは会話の楽しさとまた会いたくなる余韻が重要です。"
        : profile?.basic.industry === "ピンサロ"
        ? "ピンサロは短い時間でも期待感と親しみを作る表現が重要です。"
        : profile?.basic.industry === "女風"
        ? "女風は受容・安心感・特別扱いが重要です。"
        : "業種に合わせた打ち出しを意識すると刺さりやすくなります。";

    const learningAdvice =
      successInsight.approvedMatches.length > 0
        ? `承認済みパターン（${successInsight.approvedMatches.join(" / ")}）を優先して提案しています。`
        : successInsight.totalSuccess > 0
        ? "成功データはありますが、まだ承認済みパターンが少ないため基本ロジックを優先しています。"
        : "まだ成功データが少ないため、現時点では基本ロジックを優先しています。";

    if (selectedCategory === "写メ日記") {
      return [
        "タイトルは日本語として自然であることが最優先です。",
        learningAdvice,
        commonIndustryAdvice,
      ];
    }

    if (selectedCategory === "オキニトーク") {
      return [
        "営業感を減らして、相手を気づかう一言から入ると返信率が上がりやすいです。",
        learningAdvice,
        commonIndustryAdvice,
      ];
    }

    return [
      "SNSは露骨な営業感を出しすぎず、共感と興味づけを優先すると使いやすいです。",
      learningAdvice,
      commonIndustryAdvice,
    ];
  }

  async function persistResult(currentResult: AnalysisResult) {
    const item: SavedDraftResult = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      category,
      title: category === "写メ日記" ? title : "",
      originalText: text,
      improvedText: currentResult.bodyImproved,
      titleScore: currentResult.titleScore,
      bodyScore: currentResult.bodyScore,
      profileTypeName: profile?.diagnosis.typeName || "未診断",
      industry: profile?.basic.industry || "",
      prefecture: profile?.basic.prefecture || "",
      purpose: category === "オキニトーク" ? okiniPurpose : shameNikkiGoal,
      status: "下書き",
    };

    const rawUser = localStorage.getItem("yorushokuCurrentUser");
    if (rawUser) {
      const currentUser = JSON.parse(rawUser);
      await saveDraftResult(item, currentUser.id);
    }

    const nextDrafts = [item, ...drafts].slice(0, 50);
    setDrafts(nextDrafts);

    setSavedNotice("履歴に保存しました");
    setTimeout(() => setSavedNotice(""), 1800);
  }

  async function handleGenerateBody() {
    setIsGeneratingBody(true);
    try {
      const rawUser = localStorage.getItem("yorushokuCurrentUser");
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const goodBodiesRaw = localStorage.getItem("yorushokuGoodBodies");
      const goodBodiesData = goodBodiesRaw ? JSON.parse(goodBodiesRaw) : [];
      const learningExamplesRaw = localStorage.getItem("yorushokuLearningExamples");
      const learningExamplesData = learningExamplesRaw ? JSON.parse(learningExamplesRaw) : [];

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate_body",
          memberId: currentUser?.id,
          category,
          purpose: category === "写メ日記" ? shameNikkiGoal : undefined,
          emotionTarget: category === "写メ日記" ? emotionTarget : undefined,
          sellType: category === "写メ日記" ? sellType : undefined,
          okiniPurpose: category === "オキニトーク" ? okiniPurpose : undefined,
          relationshipLevel: category === "オキニトーク" ? relationshipLevel : undefined,
          interestLevel: category === "オキニトーク" ? interestLevel : undefined,
          partnerType: category === "オキニトーク" ? partnerType : undefined,
          sendTime: category === "オキニトーク" ? sendTime : undefined,
          industry: profile?.basic.industry,
          diagnosisInfo: profile ? {
            typeName: profile.diagnosis.typeName,
            bestTarget: profile.diagnosis.bestTarget,
            strengths: profile.diagnosis.strengths,
          } : undefined,
          goodBodies: goodBodiesData,
          learningExamples: learningExamplesData,
        }),
      });
      const json = await res.json();
      if (json.generatedBody) {
        setText(json.generatedBody);
        triggerUsabilityFeedbackIfNeeded();
      }
    } catch {
      // silent fail
    } finally {
      setIsGeneratingBody(false);
    }
  }

  function handleGenerateTitle() {
    const suggestions = buildTitleSuggestions();
    if (suggestions.length > 0) {
      setGeneratedTitleOptions(suggestions);
      setTitle(suggestions[0].text);
      setGeneratedTitle(suggestions[0].text);
    }
  }

  async function handleAnalyze() {
    setIsAiLoading(true);
    try {
      const rawExamples = localStorage.getItem("yorushokuLearningExamples");
      const rawConfig = localStorage.getItem("yorushokuLearningConfig");
      const rawGoodTitles = localStorage.getItem("yorushokuGoodTitles");
      const rawGoodBodies = localStorage.getItem("yorushokuGoodBodies");
      const learningExamples = rawExamples ? JSON.parse(rawExamples) : [];
      const learningConfig = rawConfig
        ? JSON.parse(rawConfig)
        : { ngWords: [], influenceRules: [] };
      const goodTitles = rawGoodTitles ? JSON.parse(rawGoodTitles) : [];
      const goodBodies = rawGoodBodies ? JSON.parse(rawGoodBodies) : [];

      const diagnosisInfo = profile
        ? {
            typeName: profile.diagnosis.typeName,
            bestTarget: profile.diagnosis.bestTarget,
            strengths: profile.diagnosis.strengths,
            personaText: profile.diagnosis.personaText,
            uspSummary: profile.usp.summary,
            positioning: profile.stp.positioning,
            emotionNeeds: profile.persona.emotionNeeds,
          }
        : undefined;

      const rawUser = localStorage.getItem("yorushokuCurrentUser");
      const currentUserId = rawUser ? JSON.parse(rawUser).id : undefined;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: currentUserId,
          title: category === "写メ日記" ? title : undefined,
          text,
          category,
          purpose: category === "写メ日記" ? shameNikkiGoal : undefined,
          emotionTarget: category === "写メ日記" ? emotionTarget : undefined,
          sellType: category === "写メ日記" ? sellType : undefined,
          industry: profile?.basic.industry,
          okiniPurpose: category === "オキニトーク" ? okiniPurpose : undefined,
          relationshipLevel:
            category === "オキニトーク" ? relationshipLevel : undefined,
          interestLevel:
            category === "オキニトーク" ? interestLevel : undefined,
          partnerType: category === "オキニトーク" ? partnerType : undefined,
          sendTime: category === "オキニトーク" ? sendTime : undefined,
          softSalesTone:
            category === "オキニトーク" ? softSalesTone : undefined,
          diagnosisInfo,
          learningExamples,
          goodTitles,
          goodBodies,
          ngWords: learningConfig.ngWords,
          influenceRules: learningConfig.influenceRules,
        }),
      });

      const data = await res.json();

      if (res.status === 429 && data.error === "limit_exceeded") {
        setShowLimitModal(true);
        return;
      }

      if (res.status === 403) {
        setSavedNotice("ご利用が停止されています。管理者にお問い合わせください。");
        setTimeout(() => setSavedNotice(""), 5000);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? `API error: ${res.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const nextResult: AnalysisResult = {
        titleScore: data.titleScore ?? undefined,
        bodyScore: data.bodyScore ?? 0,
        titleComment: data.titleComment ?? undefined,
        bodyComment: data.bodyComment ?? "",
        titleSuggestions: data.titleSuggestions ?? [],
        bodyImproved: data.bodyImproved ?? "",
        bodyAdvice: Array.isArray(data.bodyAdvice) ? data.bodyAdvice : [],
      };

      setResult(nextResult);
      await persistResult(nextResult);
      triggerUsabilityFeedbackIfNeeded();
      const gaUserRaw = localStorage.getItem("yorushokuCurrentUser");
      const gaPlan = gaUserRaw ? (JSON.parse(gaUserRaw).plan ?? "free") : "free";
      gaGenerateDraft({ category, bodyScore: nextResult.bodyScore, plan: gaPlan, sellType });
    } catch (err) {
      console.error("AI添削エラー:", err);
      const raw = localStorage.getItem("yorushokuCurrentUser");
      const uid = raw ? JSON.parse(raw).id : undefined;
      void import("@/lib/logger").then(({ logError }) =>
        logError("analyze_failed", "AI添削でエラーが発生", { message: String(err) }, uid)
      );
      const errMsg = err instanceof Error ? err.message : "AI添削でエラーが発生しました。";
      setSavedNotice(`⚠ ${errMsg} もう一度お試しください。`);
      setTimeout(() => setSavedNotice(""), 6000);
    } finally {
      setIsAiLoading(false);
    }
  }

  const currentUserId = (() => {
    if (typeof window === "undefined") return undefined;
    const raw = localStorage.getItem("yorushokuCurrentUser");
    return raw ? JSON.parse(raw).id : undefined;
  })();

  return (
    <main className="min-h-screen bg-[#09070f] px-4 py-8 text-[#f2eefb] sm:px-6 lg:px-8">
      {showLimitModal && currentUserId && (
        <PlanLimitModal
          memberId={currentUserId}
          onClose={() => setShowLimitModal(false)}
        />
      )}
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#e85d8a]">新規添削</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            AI添削・本文生成
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#8b84a8] sm:text-base">
            診断結果・高スコア文章・実際に使った文章を学習して、そのまま使える文章を生成します。
          </p>
          {savedNotice && (
            <p className="mt-3 text-sm font-medium text-[#e85d8a]">{savedNotice}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="xl:col-span-7">
            <div className="rounded-[28px] border border-[#231f36] bg-[#110e1c] p-6 sm:p-8">

              {/* 使い方ガイドモーダル */}
              {showGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                  <div className="relative w-full max-w-lg rounded-[24px] border border-[#231f36] bg-[#110e1c] p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setShowGuide(false)}
                      className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1e1a2e] text-[#8b84a8] hover:text-[#f2eefb] transition"
                    >
                      ✕
                    </button>
                    <h2 className="mb-6 text-base font-bold text-[#f2eefb]">使い方ガイド</h2>

                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-2 text-sm font-bold text-[#e85d8a]">① 作成済みの日記を添削する</h3>
                        <p className="text-sm leading-7 text-[#c8c2dc]">
                          すでに書いた写メ日記・オキニトーク・SNS投稿をそのまま貼り付けてください。AIがスコアをつけて、より効果的な文章に添削します。添削後の文章はそのままコピーして使えます。
                        </p>
                      </div>

                      <div>
                        <h3 className="mb-2 text-sm font-bold text-[#e85d8a]">② カテゴリの使い方</h3>
                        <ul className="space-y-2 text-sm leading-7 text-[#c8c2dc]">
                          <li><span className="font-semibold text-[#f2eefb]">写メ日記</span>　…　店舗サイトや日記ページへの投稿用。アクセス増・予約増・本指名増を狙う文章に最適化します。</li>
                          <li><span className="font-semibold text-[#f2eefb]">オキニトーク</span>　…　LINEやDMで送るメッセージ用。営業感ゼロで自然に再来店を促します。</li>
                          <li><span className="font-semibold text-[#f2eefb]">SNS</span>　…　Twitter・TikTok・Instagramなどへの投稿用。フォロワーの興味を引く文章にします。</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="mb-2 text-sm font-bold text-[#e85d8a]">③ タイトル作成</h3>
                        <p className="text-sm leading-7 text-[#c8c2dc]">
                          本文を入力して「タイトルを生成」ボタンを押すと、AIがスクロールを止めるタイトル候補を5つ提案します。過去に効果が出たパターンを学習しているため、使うほど精度が上がります。
                        </p>
                      </div>

                      <div>
                        <h3 className="mb-2 text-sm font-bold text-[#e85d8a]">④ 本文作成</h3>
                        <p className="text-sm leading-7 text-[#c8c2dc]">
                          「本文を生成」ボタンを押すと、あなたの文体・語尾・絵文字の癖を学習したAIがゼロから本文を作成します。添削データが蓄積されるほど、あなたらしい文章になっていきます。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm font-medium text-[#c8c2dc]">カテゴリ</span>
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="flex items-center gap-1 rounded-full border border-[#2f2a45] bg-[#0e0c18] px-3 py-1 text-xs text-[#8b84a8] hover:border-[#e85d8a] hover:text-[#e85d8a] transition"
                >
                  <span>？</span>
                  <span>使い方</span>
                </button>
              </div>
              <div className="mb-5">
                <label className="sr-only">
                  カテゴリ
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as Category);
                    setResult(null);
                  }}
                  className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                >
                  <option>写メ日記</option>
                  <option>オキニトーク</option>
                  <option>SNS</option>
                </select>
              </div>

              {category === "写メ日記" && (
                <>
                  <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                        狙いたい感情
                      </label>
                      <select
                        value={emotionTarget}
                        onChange={(e) =>
                          setEmotionTarget(e.target.value as EmotionTarget | "")
                        }
                        className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                      >
                        <option value="">選択しない</option>
                        <option>癒し</option>
                        <option>疑似恋愛</option>
                        <option>特別感</option>
                        <option>エロさ控えめ</option>
                        <option>親しみ</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                        目的
                      </label>
                      <select
                        value={shameNikkiGoal}
                        onChange={(e) =>
                          setShameNikkiGoal(e.target.value as ShameNikkiGoal | "")
                        }
                        className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                      >
                        <option value="">選択しない</option>
                        <option>アクセス増</option>
                        <option>予約増</option>
                        <option>本指名増</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                      売り別
                    </label>
                    <select
                      value={sellType}
                      onChange={(e) => setSellType(e.target.value as SellType | "")}
                      className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                    >
                      <option value="">選択しない</option>
                      <option>共通</option>
                      <option>M売り</option>
                      <option>S売り</option>
                      <option>痴女売り</option>
                      <option>巨乳売り</option>
                    </select>
                    <p className="mt-1.5 text-xs text-[#4d4866]">
                      選ぶとタイトル提案・本文の方向性が売り別に最適化されます
                    </p>
                  </div>

                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={handleGenerateTitle}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#e85d8a] px-5 text-sm font-semibold text-white transition hover:bg-[#d4507c]"
                    >
                      タイトルを生成
                    </button>
                    <p className="mt-1.5 text-xs text-[#4d4866]">
                      上の項目を選ぶと、選択内容に沿ったタイトル候補を生成します
                    </p>
                  </div>

                  <div className="mb-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-medium text-[#c8c2dc]">タイトル</label>
                      {title && (
                        <button
                          type="button"
                          onClick={() => copyText(title, "title-input")}
                          className="text-xs font-medium text-[#8b84a8] transition hover:text-[#e85d8a]"
                        >
                          {copiedKey === "title-input" ? "コピー完了 ✓" : "コピーする"}
                        </button>
                      )}
                    </div>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例：少し甘えたい夜って、誰かに会いたくならない？"
                      className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                    />
                    {generatedTitle && (
                      <p className="mt-2 text-xs text-[#e85d8a]">
                        生成タイトルを反映しました。必要ならそのまま編集できます。
                      </p>
                    )}
                    {generatedTitleOptions.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs font-medium text-[#8b84a8]">タイトル候補（タップで反映）</p>
                        {generatedTitleOptions.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setTitle(opt.text); setGeneratedTitle(opt.text); }}
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                              title === opt.text
                                ? "border-[#e85d8a] bg-[#e85d8a]/10 text-[#f2eefb]"
                                : "border-[#2f2a45] bg-[#0e0c18] text-[#c8c2dc] hover:border-[#e85d8a]/50"
                            }`}
                          >
                            <span>{opt.text}</span>
                            <span className={`ml-2 shrink-0 text-xs font-bold ${title === opt.text ? "text-[#e85d8a]" : "text-[#4d4866]"}`}>
                              {opt.score}点
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {category === "オキニトーク" && (
                <>
                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                      目的
                    </label>
                    <select
                      value={okiniPurpose}
                      onChange={(e) =>
                        setOkiniPurpose(e.target.value as OkiniPurpose | "")
                      }
                      className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                    >
                      <option value="">選択しない</option>
                      <option>初来店の促し</option>
                      <option>再来店の促し</option>
                    </select>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                        関係性レベル
                      </label>
                      <select
                        value={relationshipLevel}
                        onChange={(e) =>
                          setRelationshipLevel(
                            e.target.value as RelationshipLevel | ""
                          )
                        }
                        className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                      >
                        <option value="">選択しない</option>
                        <option>初めてやり取り</option>
                        <option>1回会った</option>
                        <option>リピート中</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                        温度感
                      </label>
                      <select
                        value={interestLevel}
                        onChange={(e) =>
                          setInterestLevel(e.target.value as InterestLevel | "")
                        }
                        className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                      >
                        <option value="">選択しない</option>
                        <option>低</option>
                        <option>中</option>
                        <option>高</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                        相手タイプ
                      </label>
                      <select
                        value={partnerType}
                        onChange={(e) =>
                          setPartnerType(e.target.value as OkiniPartnerType | "")
                        }
                        className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                      >
                        <option value="">選択しない</option>
                        <option>忙しい</option>
                        <option>マメじゃない</option>
                        <option>甘えたい</option>
                        <option>警戒強め</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                        送る時間帯
                      </label>
                      <select
                        value={sendTime}
                        onChange={(e) =>
                          setSendTime(e.target.value as SendTime | "")
                        }
                        className="h-12 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 text-[#f2eefb] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
                      >
                        <option value="">選択しない</option>
                        <option>昼</option>
                        <option>夜</option>
                        <option>深夜</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-5 rounded-2xl border border-[#2f2a45] bg-[#0e0c18] p-4">
                    <label className="flex items-center gap-3 text-sm font-medium text-[#c8c2dc]">
                      <input
                        type="checkbox"
                        checked={softSalesTone}
                        onChange={(e) => setSoftSalesTone(e.target.checked)}
                        className="h-4 w-4 rounded border-[#d7d1da]"
                      />
                      営業感をできるだけ消す
                    </label>
                    <p className="mt-2 text-sm leading-6 text-[#8b84a8]">
                      オンにすると、やわらかく自然な促し方を優先します。
                    </p>
                  </div>
                </>
              )}

              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-[#c8c2dc]">
                  {category === "オキニトーク" ? "本文（送る文章）" : "本文"}
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBody}
                  disabled={isGeneratingBody}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a1420] border border-[#2f2a45] px-3 py-1.5 text-xs font-semibold text-[#e85d8a] transition hover:border-[#e85d8a]/50 disabled:opacity-50"
                >
                  {isGeneratingBody ? "生成中…" : "✦ AIで本文を生成"}
                </button>
              </div>

              <div className="mb-6">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    category === "オキニトーク"
                      ? "例：お仕事おつかれさま。最近ちゃんと休めてる？"
                      : "ここに本文を入力してください"
                  }
                  className="min-h-[160px] w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-3 text-[#f2eefb] placeholder-[#4d4866] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20 sm:min-h-[220px]"
                />
                {text && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => copyText(text, "body-input")}
                      className="text-xs font-medium text-[#8b84a8] transition hover:text-[#e85d8a]"
                    >
                      {copiedKey === "body-input" ? "コピー完了 ✓" : "本文をコピーする"}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isAiLoading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#e85d8a] text-sm font-bold text-white transition hover:bg-[#d4507c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAiLoading ? "AI添削中…" : "添削する"}
              </button>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-5">
            {profile && (
              <div className="rounded-[28px] border border-[#231f36] bg-[#110e1c] p-6">
                <p className="text-sm font-medium text-[#e85d8a]">診断結果を反映中</p>

                <div className="mt-4 space-y-4 text-sm text-[#5d5965]">
                  <div>
                    <p className="font-semibold text-[#f2eefb]">あなたは</p>
                    <p className="mt-1 text-base font-bold text-[#e85d8a]">
                      {profile.diagnosis.typeName}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#f2eefb]">狙うといい相手</p>
                    <p className="mt-1 leading-6">{profile.diagnosis.bestTarget}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#f2eefb]">あなたの強み</p>
                    <p className="mt-1 leading-6">{profile.diagnosis.strengths}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#f2eefb]">業種 / 地域</p>
                    <p className="mt-1 leading-6">
                      {profile.basic.industry || "未設定"} /{" "}
                      {profile.basic.prefecture || "未設定"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-[#231f36] bg-[#110e1c] p-6">
              <p className="text-sm font-medium text-[#e85d8a]">AI学習状況</p>
              <div className="mt-4 space-y-3 text-sm text-[#5d5965]">
                <p>・{successInsight.successRateText}</p>
                <p>・承認済み一致：{successInsight.approvedMatches.length > 0 ? successInsight.approvedMatches.join(" / ") : "なし"}</p>
                <p>・全体で強い業種：{successInsight.topIndustry}</p>
                <p>・全体で強いカテゴリ：{successInsight.topCategory}</p>
                <p className="mt-3 text-xs leading-5 text-[#4d4866]">※ 高スコア文章・コピーされた文章も自動学習されます</p>
                <p>・全体で強い目的：{successInsight.topPurpose}</p>
                <p>・全体で強いスコア帯：{successInsight.topScoreBand}</p>
              </div>
            </div>

            {category === "写メ日記" && (
              <div className="rounded-[28px] border border-[#231f36] bg-[#110e1c] p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-[#e85d8a]">タイトル評価</p>
                  <span className="rounded-full bg-[#2a1420] px-3 py-1 text-sm font-semibold text-[#e85d8a]">
                    {result?.titleScore !== undefined ? `${result.titleScore}点` : "--点"}
                  </span>
                </div>

                {result?.titleSuggestions ? (
                  <>
                    <p className="mt-4 text-sm leading-7 text-[#8b84a8]">
                      {result.titleComment}
                    </p>

                    <div className="mt-5">
                      <p className="text-sm font-semibold text-[#c8c2dc]">タイトル候補</p>
                      <div className="mt-3 space-y-3">
                        {result.titleSuggestions.map((item, index) => (
                          <div
                            key={`${item.text}-${index}`}
                            className="rounded-2xl border border-[#2f2a45] bg-[#0e0c18] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-[#c8c2dc]">案 {index + 1}</p>
                              <span className="text-xs font-semibold text-[#e85d8a]">
                                {item.score}点
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-[#f2eefb]">{item.text}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setTitle(item.text)}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#2f2a45] bg-transparent px-4 text-sm font-medium text-[#8b84a8] transition hover:border-[#3d3760] hover:text-[#f2eefb]"
                              >
                                タイトルに反映
                              </button>
                              <button
                                type="button"
                                onClick={() => copyText(item.text, `title-${index}`)}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#e85d8a] px-4 text-sm font-semibold text-white transition hover:bg-[#d4507c]"
                              >
                                {copiedKey === `title-${index}` ? "コピー完了" : "コピーする"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-[#8b84a8]">
                    写メ日記では、タイトルの評価と候補がここに表示されます。
                  </p>
                )}
              </div>
            )}

            <div className="rounded-[28px] border border-[#231f36] bg-[#110e1c] p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-[#e85d8a]">
                  {category === "オキニトーク" ? "営業メール評価" : "本文評価"}
                </p>
                <span className="rounded-full bg-[#2a1420] px-3 py-1 text-sm font-semibold text-[#e85d8a]">
                  {result ? `${result.bodyScore}点` : "--点"}
                </span>
              </div>

              {result ? (
                <>
                  <p className="mt-4 text-sm leading-7 text-[#8b84a8]">{result.bodyComment}</p>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#c8c2dc]">改善ポイント</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-[#8b84a8]">
                      {result.bodyAdvice.map((item, index) => (
                        <li key={`${item}-${index}`}>・{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#c8c2dc]">
                      {category === "オキニトーク" ? "提案メッセージ" : "添削後の本文"}
                    </p>
                    <div className="mt-3 rounded-2xl border border-[#2f2a45] bg-[#0e0c18] p-4">
                      <pre className="whitespace-pre-wrap text-sm leading-7 text-[#f2eefb]">
                        {result.bodyImproved}
                      </pre>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyText(result.bodyImproved, "body-result", true)}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#e85d8a] px-4 text-sm font-semibold text-white transition hover:bg-[#d4507c]"
                    >
                      {copiedKey === "body-result" ? "✓ コピー完了" : "📋 添削後の本文をコピーする"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[#8b84a8]">
                  カテゴリに応じた評価と改善案がここに表示されます。
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* 5回に1回の評価収集ポップアップ */}
      {showUsabilityFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-sm rounded-[24px] border border-[#231f36] bg-[#110e1c] p-6">
            <button
              type="button"
              onClick={() => setShowUsabilityFeedback(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1e1a2e] text-[#8b84a8] hover:text-[#f2eefb] transition"
            >
              ✕
            </button>
            <p className="mb-1 text-xs text-[#8b84a8]">フィードバック</p>
            <p className="mb-5 text-base font-bold text-[#f2eefb]">この提案は使えましたか？</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleUsabilityFeedback("使える")}
                className="flex-1 rounded-2xl border border-[#2f2a45] py-3 text-sm font-semibold text-[#8b84a8] transition hover:border-[#e85d8a]/50 hover:bg-[#1e0a12] hover:text-[#e85d8a]"
              >
                👍 使える
              </button>
              <button
                type="button"
                onClick={() => handleUsabilityFeedback("使えない")}
                className="flex-1 rounded-2xl border border-[#2f2a45] py-3 text-sm font-semibold text-[#8b84a8] transition hover:border-[#5c1a2e] hover:bg-[#1e0a12] hover:text-[#f87171]"
              >
                👎 使えない
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィードバックトースト */}
      {showFeedbackToast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 rounded-2xl border border-[#2f2a45] bg-[#110e1c] p-4 shadow-2xl">
          {!showFeedbackReason ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#f2eefb]">この文章、実際に使いそうですか？</p>
                <button onClick={() => setShowFeedbackToast(false)} className="text-xs text-[#4d4866] hover:text-[#8b84a8]">×</button>
              </div>
              {feedbackRating === null ? (
                <div className="flex gap-2">
                  {(["使う予定", "たぶん使う", "使わない"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleFeedbackRating(r)}
                      className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${
                        r === "使わない"
                          ? "border border-[#2f2a45] text-[#8b84a8] hover:border-[#5c1a2e] hover:text-[#f87171]"
                          : "border border-[#2f2a45] text-[#8b84a8] hover:border-[#e85d8a]/50 hover:text-[#e85d8a]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm font-medium text-[#e85d8a]">ありがとうございます ✓</p>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#f2eefb]">使わない理由を教えてください</p>
                <button onClick={() => setShowFeedbackToast(false)} className="text-xs text-[#4d4866] hover:text-[#8b84a8]">×</button>
              </div>
              <div className="space-y-2">
                {["文体が合わない", "スコアに納得できない", "別の文章にした", "その他"].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => handleFeedbackReason(reason)}
                    className="block w-full rounded-xl border border-[#2f2a45] px-3 py-2 text-left text-xs text-[#8b84a8] transition hover:border-[#e85d8a]/50 hover:text-[#f2eefb]"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}