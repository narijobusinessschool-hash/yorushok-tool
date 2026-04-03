"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const prefectureOptions = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

const characterOptions = [
  "清楚系",
  "癒し系",
  "お姉さん系",
  "甘え系",
  "ギャル系",
  "セクシー系",
  "ナチュラル系",
];

const sellTypeOptions = [
  "共通（売り別なし）",
  "M売り",
  "S売り",
  "痴女売り",
  "巨乳売り",
];

const industryOptions = [
  "ピンサロ",
  "デリヘル",
  "ソープ",
  "メンズエステ",
  "セクキャバ",
  "女風",
];

const mainGoalOptions = ["アクセス増", "予約増", "本指名増", "再来店増"];

const ageRangeOptions = [
  "20代前半",
  "20代後半",
  "30代前半",
  "30代後半",
  "40代以上",
];

const jobTypeOptions = [
  "会社員",
  "経営者・役員",
  "自営業",
  "夜勤系",
  "接客業",
  "肉体労働系",
  "医療・介護",
  "不明 / 幅広い",
];

const lifestyleOptions = [
  "仕事が忙しい",
  "残業が多い",
  "休日が不規則",
  "夜に動きやすい",
  "昼に連絡を見やすい",
  "ひとり時間が少ない",
];

const visitReasonOptions = [
  "癒されたい",
  "甘えたい",
  "性欲発散",
  "寂しさを埋めたい",
  "会話を楽しみたい",
  "特別感を感じたい",
];

const emotionNeedOptions = [
  "癒し",
  "疑似恋愛",
  "安心感",
  "特別感",
  "親しみ",
  "刺激",
];

const worryOptions = [
  "営業感が強いと離脱する",
  "最初の来店に不安がある",
  "料金面で迷いやすい",
  "相性が不安",
  "重い文章が苦手",
  "返信の負担を嫌う",
];

const triggerOptions = [
  "やさしい言葉",
  "気軽さ",
  "特別扱い",
  "会うメリットが明確",
  "見た目とのギャップ",
  "落ち着けそうな雰囲気",
];

const toneOptions = [
  "やわらかい",
  "親しみやすい",
  "恋愛寄り",
  "安心感重視",
  "大人っぽい",
  "短文で軽め",
];

const sourceOptions = [
  "写メ日記",
  "オキニトーク",
  "SNS",
  "プロフィール",
  "口コミ",
  "店舗サイト",
];

const decisionPointOptions = [
  "タイトルで開く",
  "最初の1文で決まる",
  "プロフィールで判断する",
  "雰囲気重視",
  "料金とのバランス",
  "返信の感じで決まる",
];

const impressionOptions = [
  "話しやすい",
  "落ち着く",
  "癒される",
  "親しみやすい",
  "色気がある",
  "特別感がある",
  "恋人感がある",
  "ノリがいい",
];

const strengthStyleOptions = [
  "やさしく寄り添う",
  "相手を立てる",
  "甘えさせる",
  "安心させる",
  "距離を縮めるのが自然",
  "会話を広げるのが得意",
  "特別扱いが得意",
  "空気をやわらかくできる",
];

const repeatReasonOptions = [
  "居心地がいい",
  "また会いたくなる",
  "落ち着く",
  "気を使わない",
  "特別感がある",
  "会話が楽しい",
  "満足感が高い",
  "癒される",
];

const segmentTypeOptions = [
  "新規客中心",
  "リピーター中心",
  "忙しい人中心",
  "癒しを求める人中心",
  "疑似恋愛に反応する人中心",
  "気軽さ重視の人中心",
  "特別感重視の人中心",
];

const targetPriorityOptions = [
  "来店ハードルが高い新規",
  "一度来たことがある人",
  "本指名に育てたい人",
  "短文で反応する人",
  "やさしい空気感に反応する人",
  "特別扱いに反応する人",
];

const positioningOptions = [
  "癒し寄り",
  "恋愛寄り",
  "親しみ寄り",
  "特別感寄り",
  "安心感寄り",
  "大人っぽさ寄り",
  "気軽さ寄り",
];

function toggleItem(
  item: string,
  selected: string[],
  setSelected: (value: string[]) => void
) {
  if (selected.includes(item)) {
    setSelected(selected.filter((v) => v !== item));
  } else {
    setSelected([...selected, item]);
  }
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-start gap-3 rounded-2xl border border-[#e6e0e8] bg-[#fcfbfd] p-4 text-sm text-[#2c2933]"
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
            className="mt-0.5 h-4 w-4 rounded border-[#d7d1da]"
          />
          <span className="leading-6">{option}</span>
        </label>
      ))}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "選択してください",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function buildUspSummary({
  impressions,
  styles,
  repeatReasons,
}: {
  impressions: string[];
  styles: string[];
  repeatReasons: string[];
}) {
  const uspCandidates: string[] = [];

  if (
    impressions.includes("癒される") ||
    impressions.includes("落ち着く") ||
    repeatReasons.includes("癒される") ||
    repeatReasons.includes("落ち着く")
  ) {
    uspCandidates.push("癒し特化");
  }

  if (
    impressions.includes("恋人感がある") ||
    repeatReasons.includes("また会いたくなる")
  ) {
    uspCandidates.push("疑似恋愛特化");
  }

  if (
    impressions.includes("特別感がある") ||
    styles.includes("特別扱いが得意") ||
    repeatReasons.includes("特別感がある")
  ) {
    uspCandidates.push("特別感特化");
  }

  if (
    impressions.includes("話しやすい") ||
    impressions.includes("親しみやすい") ||
    repeatReasons.includes("会話が楽しい")
  ) {
    uspCandidates.push("親しみやすさ特化");
  }

  if (
    styles.includes("安心させる") ||
    repeatReasons.includes("気を使わない") ||
    repeatReasons.includes("居心地がいい")
  ) {
    uspCandidates.push("安心感特化");
  }

  if (impressions.includes("色気がある")) {
    uspCandidates.push("色気・雰囲気特化");
  }

  return uspCandidates.length > 0 ? uspCandidates : ["診断中"];
}

export default function OnboardingPage() {
  const router = useRouter();

  const [selectedSellType, setSelectedSellType] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedMainGoal, setSelectedMainGoal] = useState("");

  const [selectedAgeRange, setSelectedAgeRange] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [selectedLifestyle, setSelectedLifestyle] = useState<string[]>([]);
  const [selectedVisitReasons, setSelectedVisitReasons] = useState<string[]>([]);
  const [selectedEmotionNeeds, setSelectedEmotionNeeds] = useState<string[]>([]);
  const [selectedWorries, setSelectedWorries] = useState<string[]>([]);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedTone, setSelectedTone] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDecisionPoints, setSelectedDecisionPoints] = useState<string[]>(
    []
  );

  const [selectedImpressions, setSelectedImpressions] = useState<string[]>([]);
  const [selectedStrengthStyles, setSelectedStrengthStyles] = useState<string[]>(
    []
  );
  const [selectedRepeatReasons, setSelectedRepeatReasons] = useState<string[]>(
    []
  );

  const [selectedSegmentType, setSelectedSegmentType] = useState("");
  const [selectedTargetPriority, setSelectedTargetPriority] = useState("");
  const [selectedPositioning, setSelectedPositioning] = useState("");

  const [shopUrl, setShopUrl] = useState("");
  const [selectedPrefecture, setSelectedPrefecture] = useState("");
  const [priceRange, setPriceRange] = useState("");

  // 既存の診断データがあればフォームにプリフィル
  useEffect(() => {
    async function loadExisting() {
      const raw = localStorage.getItem("yorushokuCurrentUser");
      if (!raw) return;
      const currentUser = JSON.parse(raw);

      // DB優先で取得、なければlocalStorage
      let profile = null;
      const { data } = await supabase
        .from("member_profiles")
        .select("profile_data")
        .eq("member_id", currentUser.id)
        .single();
      if (data?.profile_data) {
        profile = data.profile_data;
      } else {
        const saved = localStorage.getItem("yorushokuPersonaProfile");
        if (saved) profile = JSON.parse(saved);
      }
      if (!profile) return;

      // basic
      if (profile.basic) {
        setSelectedSellType(profile.basic.sellType || "");
        setSelectedCharacter(profile.basic.character || "");
        setSelectedIndustry(profile.basic.industry || "");
        setSelectedMainGoal(profile.basic.mainGoal || "");
        setSelectedPrefecture(profile.basic.prefecture || "");
        setPriceRange(profile.basic.priceRange || "");
        setShopUrl(profile.basic.shopUrl || "");
      }
      // persona
      if (profile.persona) {
        setSelectedAgeRange(profile.persona.ageRange || "");
        setSelectedJobType(profile.persona.jobType || "");
        setSelectedLifestyle(profile.persona.lifestyle || []);
        setSelectedVisitReasons(profile.persona.visitReasons || []);
        setSelectedEmotionNeeds(profile.persona.emotionNeeds || []);
        setSelectedWorries(profile.persona.worries || []);
        setSelectedTriggers(profile.persona.triggers || []);
        setSelectedTone(profile.persona.tone || []);
        setSelectedSources(profile.persona.sources || []);
        setSelectedDecisionPoints(profile.persona.decisionPoints || []);
      }
      // usp
      if (profile.usp) {
        setSelectedImpressions(profile.usp.impressions || []);
        setSelectedStrengthStyles(profile.usp.strengthStyles || []);
        setSelectedRepeatReasons(profile.usp.repeatReasons || []);
      }
      // stp
      if (profile.stp) {
        setSelectedSegmentType(profile.stp.segment || "");
        setSelectedTargetPriority(profile.stp.target || "");
        setSelectedPositioning(profile.stp.positioning || "");
      }
    }
    loadExisting();
  }, []);

  const personaSummary = useMemo(() => {
    const chunks = [];

    if (selectedAgeRange) chunks.push(`${selectedAgeRange}`);
    if (selectedJobType) chunks.push(`${selectedJobType}`);
    if (selectedLifestyle.length > 0)
      chunks.push(`生活傾向：${selectedLifestyle.join(" / ")}`);
    if (selectedVisitReasons.length > 0)
      chunks.push(`来店理由：${selectedVisitReasons.join(" / ")}`);
    if (selectedEmotionNeeds.length > 0)
      chunks.push(`求める感情：${selectedEmotionNeeds.join(" / ")}`);
    if (selectedWorries.length > 0)
      chunks.push(`不安要素：${selectedWorries.join(" / ")}`);
    if (selectedTriggers.length > 0)
      chunks.push(`刺さりやすい要素：${selectedTriggers.join(" / ")}`);
    if (selectedTone.length > 0)
      chunks.push(`反応しやすい文体：${selectedTone.join(" / ")}`);
    if (selectedSources.length > 0)
      chunks.push(`見られやすい導線：${selectedSources.join(" / ")}`);
    if (selectedDecisionPoints.length > 0)
      chunks.push(`判断ポイント：${selectedDecisionPoints.join(" / ")}`);

    return chunks;
  }, [
    selectedAgeRange,
    selectedJobType,
    selectedLifestyle,
    selectedVisitReasons,
    selectedEmotionNeeds,
    selectedWorries,
    selectedTriggers,
    selectedTone,
    selectedSources,
    selectedDecisionPoints,
  ]);

  const uspSummary = useMemo(() => {
    return buildUspSummary({
      impressions: selectedImpressions,
      styles: selectedStrengthStyles,
      repeatReasons: selectedRepeatReasons,
    });
  }, [selectedImpressions, selectedStrengthStyles, selectedRepeatReasons]);

  const diagnosisResult = useMemo(() => {
    const typeName =
      selectedPositioning && selectedCharacter
        ? `${selectedPositioning} ${selectedCharacter}タイプ`
        : selectedPositioning
        ? `${selectedPositioning}タイプ`
        : selectedCharacter
        ? `${selectedCharacter}タイプ`
        : "診断中タイプ";

    const bestTarget =
      selectedTargetPriority ||
      selectedSegmentType ||
      "来店ハードルが高いけど相性が合えば通いやすい人";

    const strengths =
      uspSummary.length > 0 ? uspSummary.join(" / ") : "診断中";

    const personaText = [
      selectedAgeRange || "年齢帯未設定",
      selectedJobType || "職業未設定",
      selectedVisitReasons.length > 0
        ? `来店理由は ${selectedVisitReasons.join("・")}`
        : "来店理由未設定",
      selectedEmotionNeeds.length > 0
        ? `求める感情は ${selectedEmotionNeeds.join("・")}`
        : "求める感情未設定",
      selectedDecisionPoints.length > 0
        ? `判断ポイントは ${selectedDecisionPoints.join("・")}`
        : "判断ポイント未設定",
    ].join(" / ");

    return {
      typeName,
      bestTarget,
      strengths,
      personaText,
    };
  }, [
    selectedPositioning,
    selectedCharacter,
    selectedTargetPriority,
    selectedSegmentType,
    uspSummary,
    selectedAgeRange,
    selectedJobType,
    selectedVisitReasons,
    selectedEmotionNeeds,
    selectedDecisionPoints,
  ]);

  const handleComplete = async () => {
    const payload = {
      basic: {
        sellType: selectedSellType,
        character: selectedCharacter,
        industry: selectedIndustry,
        prefecture: selectedPrefecture,
        mainGoal: selectedMainGoal,
        priceRange,
        shopUrl,
      },
      persona: {
        ageRange: selectedAgeRange,
        jobType: selectedJobType,
        lifestyle: selectedLifestyle,
        visitReasons: selectedVisitReasons,
        emotionNeeds: selectedEmotionNeeds,
        worries: selectedWorries,
        triggers: selectedTriggers,
        tone: selectedTone,
        sources: selectedSources,
        decisionPoints: selectedDecisionPoints,
      },
      usp: {
        impressions: selectedImpressions,
        strengthStyles: selectedStrengthStyles,
        repeatReasons: selectedRepeatReasons,
        summary: uspSummary,
      },
      stp: {
        segment: selectedSegmentType,
        target: selectedTargetPriority,
        positioning: selectedPositioning,
      },
      diagnosis: diagnosisResult,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem("yorushokuPersonaProfile", JSON.stringify(payload));

    const raw = localStorage.getItem("yorushokuCurrentUser");
    if (raw) {
      const currentUser = JSON.parse(raw);
      await supabase.from("member_profiles").upsert({
        member_id: currentUser.id,
        profile_data: payload,
        updated_at: new Date().toISOString(),
      });
    }

    router.push("/mypage");
  };

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#a3476b]">初回設定</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            刺さる文章を作るための診断設定
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66616d] sm:text-base">
            使用者が自分で顧客理解やUSPを言語化できなくても使えるように、
            選択式でペルソナ・USP・STP分析を整理し、診断結果を表示します。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">1. 基本設定</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="売り別"
                  value={selectedSellType}
                  onChange={setSelectedSellType}
                  options={sellTypeOptions}
                  placeholder="選択してください（任意）"
                />
                <SelectField
                  label="キャラ設定"
                  value={selectedCharacter}
                  onChange={setSelectedCharacter}
                  options={characterOptions}
                />
                <SelectField
                  label="業種"
                  value={selectedIndustry}
                  onChange={setSelectedIndustry}
                  options={industryOptions}
                />
                <SelectField
                  label="都道府県"
                  value={selectedPrefecture}
                  onChange={setSelectedPrefecture}
                  options={prefectureOptions}
                />
                <SelectField
                  label="一番強くしたい目的"
                  value={selectedMainGoal}
                  onChange={setSelectedMainGoal}
                  options={mainGoalOptions}
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">2. 来てほしい相手の基本属性</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="年齢帯"
                  value={selectedAgeRange}
                  onChange={setSelectedAgeRange}
                  options={ageRangeOptions}
                />
                <SelectField
                  label="職業タイプ"
                  value={selectedJobType}
                  onChange={setSelectedJobType}
                  options={jobTypeOptions}
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  生活・仕事の傾向
                </label>
                <CheckboxGroup
                  options={lifestyleOptions}
                  selected={selectedLifestyle}
                  onToggle={(value) =>
                    toggleItem(value, selectedLifestyle, setSelectedLifestyle)
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">3. 相手が求めているもの</h2>
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  来店理由
                </label>
                <CheckboxGroup
                  options={visitReasonOptions}
                  selected={selectedVisitReasons}
                  onToggle={(value) =>
                    toggleItem(value, selectedVisitReasons, setSelectedVisitReasons)
                  }
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  文章で一番満たしたい感情
                </label>
                <CheckboxGroup
                  options={emotionNeedOptions}
                  selected={selectedEmotionNeeds}
                  onToggle={(value) =>
                    toggleItem(value, selectedEmotionNeeds, setSelectedEmotionNeeds)
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">4. 離脱理由と刺さる要素</h2>
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  離脱しやすい不安要素
                </label>
                <CheckboxGroup
                  options={worryOptions}
                  selected={selectedWorries}
                  onToggle={(value) =>
                    toggleItem(value, selectedWorries, setSelectedWorries)
                  }
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  反応しやすいきっかけ
                </label>
                <CheckboxGroup
                  options={triggerOptions}
                  selected={selectedTriggers}
                  onToggle={(value) =>
                    toggleItem(value, selectedTriggers, setSelectedTriggers)
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">5. 刺さりやすい文章トーン</h2>
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  反応しやすい文体
                </label>
                <CheckboxGroup
                  options={toneOptions}
                  selected={selectedTone}
                  onToggle={(value) =>
                    toggleItem(value, selectedTone, setSelectedTone)
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">6. どこを見て判断するか</h2>
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  よく見られる導線
                </label>
                <CheckboxGroup
                  options={sourceOptions}
                  selected={selectedSources}
                  onToggle={(value) =>
                    toggleItem(value, selectedSources, setSelectedSources)
                  }
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  相手が判断しやすいポイント
                </label>
                <CheckboxGroup
                  options={decisionPointOptions}
                  selected={selectedDecisionPoints}
                  onToggle={(value) =>
                    toggleItem(
                      value,
                      selectedDecisionPoints,
                      setSelectedDecisionPoints
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">7. USP診断</h2>
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  お客様に持たれやすい印象
                </label>
                <CheckboxGroup
                  options={impressionOptions}
                  selected={selectedImpressions}
                  onToggle={(value) =>
                    toggleItem(value, selectedImpressions, setSelectedImpressions)
                  }
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  得意な接し方
                </label>
                <CheckboxGroup
                  options={strengthStyleOptions}
                  selected={selectedStrengthStyles}
                  onToggle={(value) =>
                    toggleItem(
                      value,
                      selectedStrengthStyles,
                      setSelectedStrengthStyles
                    )
                  }
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                  リピートされやすい理由
                </label>
                <CheckboxGroup
                  options={repeatReasonOptions}
                  selected={selectedRepeatReasons}
                  onToggle={(value) =>
                    toggleItem(
                      value,
                      selectedRepeatReasons,
                      setSelectedRepeatReasons
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">8. STP診断</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SelectField
                  label="S：セグメント"
                  value={selectedSegmentType}
                  onChange={setSelectedSegmentType}
                  options={segmentTypeOptions}
                />
                <SelectField
                  label="T：最優先ターゲット"
                  value={selectedTargetPriority}
                  onChange={setSelectedTargetPriority}
                  options={targetPriorityOptions}
                />
                <SelectField
                  label="P：打ち出しポジション"
                  value={selectedPositioning}
                  onChange={setSelectedPositioning}
                  options={positioningOptions}
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <h2 className="text-xl font-bold">9. 店舗・価格情報</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                    店舗URL
                  </label>
                  <input
                    value={shopUrl}
                    onChange={(e) => setShopUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                    価格帯
                  </label>
                  <select
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                  >
                    <option value="">選択してください</option>
                    <option value="高級">高級</option>
                    <option value="中価格">中価格</option>
                    <option value="低価格">低価格</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <a
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-6 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                戻る
              </a>
              <button
                type="button"
                onClick={handleComplete}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
              >
                診断結果を見る
              </button>
            </div>
          </section>

          <aside className="lg:col-span-4">
            <div className="sticky top-6 space-y-6">
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">診断結果プレビュー</p>

                <div className="mt-5 space-y-5 text-sm text-[#5d5965]">
                  <div>
                    <p className="font-semibold text-[#2c2933]">あなたは</p>
                    <p className="mt-1 text-base font-bold text-[#7a2e4d]">
                      {diagnosisResult.typeName}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#2c2933]">こういった人を狙うといい</p>
                    <p className="mt-1 leading-6">{diagnosisResult.bestTarget}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#2c2933]">あなたの強み</p>
                    <p className="mt-1 leading-6">{diagnosisResult.strengths}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-[#2c2933]">想定ペルソナ</p>
                    <p className="mt-1 leading-6">{diagnosisResult.personaText}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">STP要約</p>
                <div className="mt-4 space-y-2 text-sm text-[#5d5965]">
                  <p>・S：{selectedSegmentType || "未設定"}</p>
                  <p>・T：{selectedTargetPriority || "未設定"}</p>
                  <p>・P：{selectedPositioning || "未設定"}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}