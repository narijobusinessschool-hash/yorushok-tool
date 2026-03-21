"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "写メ日記" | "オキニトーク" | "SNS";
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

function saveDraftResult(item: SavedDraftResult) {
  const raw = localStorage.getItem("yorushokuDraftResults");
  const existing: SavedDraftResult[] = raw ? JSON.parse(raw) : [];
  const next = [item, ...existing].slice(0, 50);
  localStorage.setItem("yorushokuDraftResults", JSON.stringify(next));
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
  const [emotionTarget, setEmotionTarget] = useState<EmotionTarget>("癒し");
  const [shameNikkiGoal, setShameNikkiGoal] =
    useState<ShameNikkiGoal>("アクセス増");

  const [text, setText] = useState("");

  const [okiniPurpose, setOkiniPurpose] =
    useState<OkiniPurpose>("初来店の促し");
  const [relationshipLevel, setRelationshipLevel] =
    useState<RelationshipLevel>("初めてやり取り");
  const [interestLevel, setInterestLevel] = useState<InterestLevel>("中");
  const [softSalesTone, setSoftSalesTone] = useState(true);
  const [partnerType, setPartnerType] = useState<OkiniPartnerType>("忙しい");
  const [sendTime, setSendTime] = useState<SendTime>("夜");

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedKey, setCopiedKey] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [savedNotice, setSavedNotice] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [drafts, setDrafts] = useState<SavedDraftResult[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});
  const [approvedPatterns, setApprovedPatterns] = useState<ApprovedPatternMap>({});

  useEffect(() => {
    const savedProfile = localStorage.getItem("yorushokuPersonaProfile");
    const rawDrafts = localStorage.getItem("yorushokuDraftResults");
    const rawOutcomes = localStorage.getItem("yorushokuDraftOutcomes");
    const rawApproved = localStorage.getItem("yorushokuApprovedPatterns");

    if (savedProfile) {
      const parsed = JSON.parse(savedProfile) as SavedProfile;
      setProfile(parsed);

      const autoGoal = getProfileGoal(parsed);
      const autoEmotion = getProfileEmotion(parsed);

      if (autoGoal) setShameNikkiGoal(autoGoal);
      if (autoEmotion) setEmotionTarget(autoEmotion);
    }

    if (rawDrafts) setDrafts(JSON.parse(rawDrafts));
    if (rawOutcomes) setOutcomes(JSON.parse(rawOutcomes));
    if (rawApproved) setApprovedPatterns(JSON.parse(rawApproved));
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

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1600);
    } catch {
      setCopiedKey("");
    }
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

    return [...successBoost, ...industrySpecific, ...positioningAdditions, ...base];
  }

  function generateAiTitle() {
    const templates = getTitleTemplates(emotionTarget, shameNikkiGoal);
    const selected =
      templates[Math.floor(Math.random() * templates.length)] ||
      "少し甘えたい夜って、誰かに会いたくならない？";

    setGeneratedTitle(selected);
    setTitle(selected);
  }

  function buildTitleSuggestions() {
    const templates = getTitleTemplates(emotionTarget, shameNikkiGoal);
    const unique = Array.from(new Set(templates));

    const scored = unique.map((item) => {
      let score = calculateTitleScore(item);

      if (approvedPatterns[`purpose:${shameNikkiGoal}`]) score += 3;
      if (approvedPatterns[`industry:${profile?.basic.industry || ""}`]) score += 3;
      if (
        profile?.basic.industry &&
        industrySpecificTitleMap[profile.basic.industry]?.[emotionTarget]?.includes(item)
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

  function persistResult(currentResult: AnalysisResult) {
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

    saveDraftResult(item);
    const nextDrafts = [item, ...drafts].slice(0, 50);
    setDrafts(nextDrafts);

    setSavedNotice("履歴に保存しました");
    setTimeout(() => setSavedNotice(""), 1800);
  }

  async function handleAnalyze() {
    setIsAiLoading(true);
    try {
      const rawExamples = localStorage.getItem("yorushokuLearningExamples");
      const rawConfig = localStorage.getItem("yorushokuLearningConfig");
      const learningExamples = rawExamples ? JSON.parse(rawExamples) : [];
      const learningConfig = rawConfig
        ? JSON.parse(rawConfig)
        : { ngWords: [], influenceRules: [] };

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

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: category === "写メ日記" ? title : undefined,
          text,
          category,
          purpose: category === "写メ日記" ? shameNikkiGoal : undefined,
          emotionTarget: category === "写メ日記" ? emotionTarget : undefined,
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
          ngWords: learningConfig.ngWords,
          influenceRules: learningConfig.influenceRules,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const nextResult: AnalysisResult = {
        titleScore: data.titleScore ?? undefined,
        bodyScore: data.bodyScore ?? 50,
        titleComment: data.titleComment ?? undefined,
        bodyComment: data.bodyComment ?? "",
        titleSuggestions: data.titleSuggestions ?? [],
        bodyImproved: data.bodyImproved ?? "",
        bodyAdvice: Array.isArray(data.bodyAdvice) ? data.bodyAdvice : [],
      };

      setResult(nextResult);
      persistResult(nextResult);
    } catch (err) {
      console.error("AI添削エラー:", err);
      setSavedNotice("AI添削でエラーが発生しました。もう一度お試しください。");
      setTimeout(() => setSavedNotice(""), 3000);
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#a3476b]">新規添削</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            診断結果と承認済み成功パターンを反映して文章を添削する
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#66616d] sm:text-base">
            診断結果に加え、管理画面で採用したパターンだけを学習反映します。
          </p>
          {savedNotice && (
            <p className="mt-3 text-sm font-medium text-[#7a2e4d]">{savedNotice}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="xl:col-span-7">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  カテゴリ
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as Category);
                    setResult(null);
                  }}
                  className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
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
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        狙いたい感情
                      </label>
                      <select
                        value={emotionTarget}
                        onChange={(e) =>
                          setEmotionTarget(e.target.value as EmotionTarget)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                      >
                        <option>癒し</option>
                        <option>疑似恋愛</option>
                        <option>特別感</option>
                        <option>エロさ控えめ</option>
                        <option>親しみ</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        目的
                      </label>
                      <select
                        value={shameNikkiGoal}
                        onChange={(e) =>
                          setShameNikkiGoal(e.target.value as ShameNikkiGoal)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                      >
                        <option>アクセス増</option>
                        <option>予約増</option>
                        <option>本指名増</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={generateAiTitle}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-5 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
                    >
                      タイトルをAIで生成
                    </button>
                  </div>

                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                      タイトル
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例：少し甘えたい夜って、誰かに会いたくならない？"
                      className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                    />
                    {generatedTitle && (
                      <p className="mt-2 text-xs text-[#7a2e4d]">
                        生成タイトルを反映しました。必要ならそのまま編集できます。
                      </p>
                    )}
                  </div>
                </>
              )}

              {category === "オキニトーク" && (
                <>
                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                      目的
                    </label>
                    <select
                      value={okiniPurpose}
                      onChange={(e) =>
                        setOkiniPurpose(e.target.value as OkiniPurpose)
                      }
                      className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                    >
                      <option>初来店の促し</option>
                      <option>再来店の促し</option>
                    </select>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        関係性レベル
                      </label>
                      <select
                        value={relationshipLevel}
                        onChange={(e) =>
                          setRelationshipLevel(
                            e.target.value as RelationshipLevel
                          )
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                      >
                        <option>初めてやり取り</option>
                        <option>1回会った</option>
                        <option>リピート中</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        温度感
                      </label>
                      <select
                        value={interestLevel}
                        onChange={(e) =>
                          setInterestLevel(e.target.value as InterestLevel)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                      >
                        <option>低</option>
                        <option>中</option>
                        <option>高</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        相手タイプ
                      </label>
                      <select
                        value={partnerType}
                        onChange={(e) =>
                          setPartnerType(e.target.value as OkiniPartnerType)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                      >
                        <option>忙しい</option>
                        <option>マメじゃない</option>
                        <option>甘えたい</option>
                        <option>警戒強め</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        送る時間帯
                      </label>
                      <select
                        value={sendTime}
                        onChange={(e) =>
                          setSendTime(e.target.value as SendTime)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                      >
                        <option>昼</option>
                        <option>夜</option>
                        <option>深夜</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-5 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4">
                    <label className="flex items-center gap-3 text-sm font-medium text-[#2c2933]">
                      <input
                        type="checkbox"
                        checked={softSalesTone}
                        onChange={(e) => setSoftSalesTone(e.target.checked)}
                        className="h-4 w-4 rounded border-[#d7d1da]"
                      />
                      営業感をできるだけ消す
                    </label>
                    <p className="mt-2 text-sm leading-6 text-[#66616d]">
                      オンにすると、やわらかく自然な促し方を優先します。
                    </p>
                  </div>
                </>
              )}

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  {category === "オキニトーク" ? "本文（送る文章）" : "本文"}
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    category === "オキニトーク"
                      ? "例：お仕事おつかれさま。最近ちゃんと休めてる？"
                      : "ここに本文を入力してください"
                  }
                  className="min-h-[220px] w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 py-3 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isAiLoading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#a3476b] text-sm font-semibold text-white transition hover:bg-[#8c3c5b] disabled:cursor-not-allowed disabled:bg-[#d2afbe]"
              >
                {isAiLoading ? "AI添削中…" : "添削する"}
              </button>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-5">
            {profile && (
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">診断結果を反映中</p>

                <div className="mt-4 space-y-4 text-sm text-[#5d5965]">
                  <div>
                    <p className="font-semibold text-[#2c2933]">あなたは</p>
                    <p className="mt-1 text-base font-bold text-[#7a2e4d]">
                      {profile.diagnosis.typeName}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#2c2933]">狙うといい相手</p>
                    <p className="mt-1 leading-6">{profile.diagnosis.bestTarget}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#2c2933]">あなたの強み</p>
                    <p className="mt-1 leading-6">{profile.diagnosis.strengths}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#2c2933]">業種 / 地域</p>
                    <p className="mt-1 leading-6">
                      {profile.basic.industry || "未設定"} /{" "}
                      {profile.basic.prefecture || "未設定"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">承認済み学習パターン</p>
              <div className="mt-4 space-y-3 text-sm text-[#5d5965]">
                <p>・{successInsight.successRateText}</p>
                <p>・承認済み一致：{successInsight.approvedMatches.length > 0 ? successInsight.approvedMatches.join(" / ") : "なし"}</p>
                <p>・全体で強い業種：{successInsight.topIndustry}</p>
                <p>・全体で強いカテゴリ：{successInsight.topCategory}</p>
                <p>・全体で強い目的：{successInsight.topPurpose}</p>
                <p>・全体で強いスコア帯：{successInsight.topScoreBand}</p>
              </div>
            </div>

            {category === "写メ日記" && (
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-[#a3476b]">タイトル評価</p>
                  <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-sm font-semibold text-[#7a2e4d]">
                    {result?.titleScore !== undefined ? `${result.titleScore}点` : "--点"}
                  </span>
                </div>

                {result?.titleSuggestions ? (
                  <>
                    <p className="mt-4 text-sm leading-7 text-[#5b5661]">
                      {result.titleComment}
                    </p>

                    <div className="mt-5">
                      <p className="text-sm font-semibold text-[#2e2a3b]">タイトル候補</p>
                      <div className="mt-3 space-y-3">
                        {result.titleSuggestions.map((item, index) => (
                          <div
                            key={`${item.text}-${index}`}
                            className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-[#2e2a3b]">案 {index + 1}</p>
                              <span className="text-xs font-semibold text-[#7a2e4d]">
                                {item.score}点
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-[#5b5661]">{item.text}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setTitle(item.text)}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
                              >
                                タイトルに反映
                              </button>
                              <button
                                type="button"
                                onClick={() => copyText(item.text, `title-${index}`)}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
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
                  <p className="mt-4 text-sm leading-7 text-[#66616d]">
                    写メ日記では、タイトルの評価と候補がここに表示されます。
                  </p>
                )}
              </div>
            )}

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-[#a3476b]">
                  {category === "オキニトーク" ? "営業メール評価" : "本文評価"}
                </p>
                <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-sm font-semibold text-[#7a2e4d]">
                  {result ? `${result.bodyScore}点` : "--点"}
                </span>
              </div>

              {result ? (
                <>
                  <p className="mt-4 text-sm leading-7 text-[#5b5661]">{result.bodyComment}</p>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#2e2a3b]">改善ポイント</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5b5661]">
                      {result.bodyAdvice.map((item, index) => (
                        <li key={`${item}-${index}`}>・{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#2e2a3b]">
                      {category === "オキニトーク" ? "提案メッセージ" : "添削後の本文"}
                    </p>
                    <div className="mt-3 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4">
                      <pre className="whitespace-pre-wrap text-sm leading-7 text-[#5b5661]">
                        {result.bodyImproved}
                      </pre>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyText(result.bodyImproved, "body-result")}
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
                    >
                      {copiedKey === "body-result" ? "コピー完了" : "本文をコピーする"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[#66616d]">
                  カテゴリに応じた評価と改善案がここに表示されます。
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}