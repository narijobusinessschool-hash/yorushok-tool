"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminNotifier from "@/components/AdminNotifier";

type SavedDraftResult = {
  id: string;
  createdAt: string;
  category: "写メ日記" | "オキニトーク" | "SNS";
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

type PatternItem = {
  key: string;
  type: "industry" | "category" | "purpose" | "profileType" | "prefecture" | "scoreBand";
  label: string;
  count: number;
  rate: number;
};

function buildCountMap(items: string[]) {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    if (!item) return;
    map[item] = (map[item] || 0) + 1;
  });
  return map;
}

function mapToPatternItems(
  map: Record<string, number>,
  total: number,
  type: PatternItem["type"]
): PatternItem[] {
  return Object.entries(map)
    .map(([label, count]) => ({
      key: `${type}:${label}`,
      type,
      label,
      count,
      rate: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function getScoreBand(score: number) {
  if (score >= 90) return "90点以上";
  if (score >= 80) return "80〜89点";
  if (score >= 70) return "70〜79点";
  if (score >= 60) return "60〜69点";
  return "60点未満";
}

function getBadgeLabel(type: PatternItem["type"]) {
  if (type === "industry") return "業種";
  if (type === "category") return "カテゴリ";
  if (type === "purpose") return "目的";
  if (type === "profileType") return "診断タイプ";
  if (type === "prefecture") return "地域";
  return "スコア帯";
}

const GOOD_TITLES_KEY = "yorushokuGoodTitles";
const GOOD_BODIES_KEY = "yorushokuGoodBodies";
const NG_WORDS_KEY = "yorushokuLearningConfig";

type CardId = "members" | "permissions" | "device" | "logs" | "inquiries" | "visitors" | "feedback" | "patterns" | "banners";
const DEFAULT_CARD_ORDER: CardId[] = ["members", "permissions", "device", "logs", "inquiries", "visitors", "feedback", "patterns", "banners"];
const CARD_ORDER_KEY = "yorushokuAdminCardOrder";

type VisitorPeriod = "day" | "week" | "month" | "60d" | "90d" | "all" | "custom";
const PERIOD_LABELS: { id: VisitorPeriod; label: string }[] = [
  { id: "day", label: "日" },
  { id: "week", label: "週" },
  { id: "month", label: "月" },
  { id: "60d", label: "60日" },
  { id: "90d", label: "90日" },
  { id: "all", label: "全期間" },
  { id: "custom", label: "カスタム" },
];

function getPeriodRange(period: VisitorPeriod, customFrom?: string, customTo?: string) {
  const now = new Date();
  if (period === "day") {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (period === "week") {
    return { from: new Date(now.getTime() - 7 * 864e5).toISOString(), to: now.toISOString() };
  }
  if (period === "month") {
    return { from: new Date(now.getTime() - 30 * 864e5).toISOString(), to: now.toISOString() };
  }
  if (period === "60d") {
    return { from: new Date(now.getTime() - 60 * 864e5).toISOString(), to: now.toISOString() };
  }
  if (period === "90d") {
    return { from: new Date(now.getTime() - 90 * 864e5).toISOString(), to: now.toISOString() };
  }
  if (period === "all") {
    return { from: undefined, to: undefined };
  }
  if (period === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo + "T23:59:59").toISOString() };
  }
  return { from: undefined, to: undefined };
}

export default function AdminPage() {
  const [drafts, setDrafts] = useState<SavedDraftResult[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});
  const [approvedPatterns, setApprovedPatterns] = useState<ApprovedPatternMap>(
    {}
  );
  const [savedMessage, setSavedMessage] = useState("");

  // カード順序
  const [cardOrder, setCardOrder] = useState<CardId[]>(DEFAULT_CARD_ORDER);
  const dragId = useRef<CardId | null>(null);
  const [dragOverId, setDragOverId] = useState<CardId | null>(null);

  // 問い合わせ未読
  const [unreadCount, setUnreadCount] = useState(0);

  // 訪問者
  const [visitorPeriod, setVisitorPeriod] = useState<VisitorPeriod>("day");
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [realtimeCount, setRealtimeCount] = useState<number | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // OpenAI残高
  const [openAiBilling, setOpenAiBilling] = useState<{ remainingUsd: number; usedUsd: number; isAlert: boolean } | null>(null);

  // システム状態
  const [systemStatus, setSystemStatus] = useState<{ dbOk: boolean; openaiOk: boolean; resendOk: boolean } | null>(null);
  const [pendingPatternCount, setPendingPatternCount] = useState(0);

  // 学習データ
  const [goodTitles, setGoodTitles] = useState<string[]>([]);
  const [goodBodies, setGoodBodies] = useState<string[]>([]);
  const [ngWords, setNgWords] = useState<string[]>([]);
  const [titleInput, setTitleInput] = useState("");
  const [bodyInput, setBodyInput] = useState("");
  const [ngWordInput, setNgWordInput] = useState("");
  const [learnTab, setLearnTab] = useState<"titles" | "bodies" | "ng">("titles");

  // カード順序をlocalStorageから復元
  useEffect(() => {
    const saved = localStorage.getItem(CARD_ORDER_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CardId[];
        // 新カードが追加されていれば末尾に追加
        const merged = [...parsed, ...DEFAULT_CARD_ORDER.filter((id) => !parsed.includes(id))];
        setCardOrder(merged);
      } catch { /* ignore */ }
    }
  }, []);

  // 未読件数取得（30秒ごと）
  useEffect(() => {
    async function fetchUnread() {
      const res = await fetch("/api/inquiries?unread=1");
      const json = await res.json();
      setUnreadCount(json.count ?? 0);
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, []);

  // 訪問者数取得
  useEffect(() => {
    async function fetchVisitors() {
      const { from, to } = getPeriodRange(visitorPeriod, customFrom, customTo);
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/visitors?${params}`);
      const json = await res.json();
      setVisitorCount(json.count ?? 0);
      setRealtimeCount(json.realtime ?? 0);
    }
    if (visitorPeriod !== "custom" || (customFrom && customTo)) {
      fetchVisitors();
    }
    const t = setInterval(() => {
      if (visitorPeriod !== "custom" || (customFrom && customTo)) fetchVisitors();
    }, 30000);
    return () => clearInterval(t);
  }, [visitorPeriod, customFrom, customTo]);

  // OpenAI残高取得
  useEffect(() => {
    fetch("/api/admin/openai-billing")
      .then((r) => r.json())
      .then((d) => { if (d.remainingUsd !== undefined) setOpenAiBilling(d); })
      .catch(() => {});
  }, []);

  // システム状態取得
  useEffect(() => {
    fetch("/api/admin/system-status")
      .then((r) => r.json())
      .then(setSystemStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/pattern-suggestions?status=pending")
      .then((r) => r.json())
      .then((d) => setPendingPatternCount(d.suggestions?.length ?? 0))
      .catch(() => {});
  }, []);

  // ドラッグ&ドロップ操作
  function handleDragStart(id: CardId) { dragId.current = id; }
  function handleDragOver(e: React.DragEvent, id: CardId) {
    e.preventDefault();
    setDragOverId(id);
  }
  function handleDrop(targetId: CardId) {
    const fromId = dragId.current;
    if (!fromId || fromId === targetId) { setDragOverId(null); return; }
    const next = [...cardOrder];
    const fi = next.indexOf(fromId);
    const ti = next.indexOf(targetId);
    next.splice(fi, 1);
    next.splice(ti, 0, fromId);
    setCardOrder(next);
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(next));
    dragId.current = null;
    setDragOverId(null);
  }

  useEffect(() => {
    const rawDrafts = localStorage.getItem("yorushokuDraftResults");
    const rawOutcomes = localStorage.getItem("yorushokuDraftOutcomes");
    const rawApproved = localStorage.getItem("yorushokuApprovedPatterns");

    if (rawDrafts) setDrafts(JSON.parse(rawDrafts));
    if (rawOutcomes) setOutcomes(JSON.parse(rawOutcomes));
    if (rawApproved) setApprovedPatterns(JSON.parse(rawApproved));

    const rawTitles = localStorage.getItem(GOOD_TITLES_KEY);
    const rawBodies = localStorage.getItem(GOOD_BODIES_KEY);
    const rawConfig = localStorage.getItem(NG_WORDS_KEY);

    if (rawTitles) setGoodTitles(JSON.parse(rawTitles));
    if (rawBodies) setGoodBodies(JSON.parse(rawBodies));
    if (rawConfig) {
      const config = JSON.parse(rawConfig);
      if (Array.isArray(config.ngWords)) setNgWords(config.ngWords);
    }
  }, []);

  function addGoodTitle() {
    const v = titleInput.trim();
    if (!v) return;
    const next = [v, ...goodTitles].slice(0, 200);
    setGoodTitles(next);
    localStorage.setItem(GOOD_TITLES_KEY, JSON.stringify(next));
    setTitleInput("");
    setSavedMessage("良いタイトルを追加しました");
    setTimeout(() => setSavedMessage(""), 1500);
  }

  function removeGoodTitle(index: number) {
    const next = goodTitles.filter((_, i) => i !== index);
    setGoodTitles(next);
    localStorage.setItem(GOOD_TITLES_KEY, JSON.stringify(next));
  }

  function addGoodBody() {
    const v = bodyInput.trim();
    if (!v) return;
    const next = [v, ...goodBodies].slice(0, 100);
    setGoodBodies(next);
    localStorage.setItem(GOOD_BODIES_KEY, JSON.stringify(next));
    setBodyInput("");
    setSavedMessage("良い本文を追加しました");
    setTimeout(() => setSavedMessage(""), 1500);
  }

  function removeGoodBody(index: number) {
    const next = goodBodies.filter((_, i) => i !== index);
    setGoodBodies(next);
    localStorage.setItem(GOOD_BODIES_KEY, JSON.stringify(next));
  }

  function addNgWord() {
    const v = ngWordInput.trim();
    if (!v || ngWords.includes(v)) return;
    const next = [...ngWords, v];
    setNgWords(next);
    const raw = localStorage.getItem(NG_WORDS_KEY);
    const config = raw ? JSON.parse(raw) : { ngWords: [], influenceRules: [] };
    localStorage.setItem(NG_WORDS_KEY, JSON.stringify({ ...config, ngWords: next }));
    setNgWordInput("");
    setSavedMessage("NGワードを追加しました");
    setTimeout(() => setSavedMessage(""), 1500);
  }

  function removeNgWord(word: string) {
    const next = ngWords.filter((w) => w !== word);
    setNgWords(next);
    const raw = localStorage.getItem(NG_WORDS_KEY);
    const config = raw ? JSON.parse(raw) : { ngWords: [], influenceRules: [] };
    localStorage.setItem(NG_WORDS_KEY, JSON.stringify({ ...config, ngWords: next }));
  }

  const analysis = useMemo(() => {
    const merged = drafts
      .map((draft) => ({
        ...draft,
        outcome: outcomes[draft.id],
      }))
      .filter((item) => item.outcome);

    const usedItems = merged.filter((item) => item.outcome?.used === "使った");

    const successItems = usedItems.filter(
      (item) =>
        item.outcome?.reservation === "あり" ||
        item.outcome?.nomination === "あり" ||
        item.outcome?.visit === "あり"
    );

    const totalUsed = usedItems.length;
    const totalSuccess = successItems.length;

    const categoryMap = buildCountMap(successItems.map((item) => item.category));
    const industryMap = buildCountMap(
      successItems.map((item) => item.industry || "未設定")
    );
    const purposeMap = buildCountMap(
      successItems.map((item) => item.purpose || "未設定")
    );
    const typeMap = buildCountMap(
      successItems.map((item) => item.profileTypeName || "未設定")
    );
    const prefectureMap = buildCountMap(
      successItems.map((item) => item.prefecture || "未設定")
    );
    const scoreBandMap = buildCountMap(
      successItems.map((item) => getScoreBand(item.bodyScore))
    );

    const allPatterns: PatternItem[] = [
      ...mapToPatternItems(industryMap, totalSuccess, "industry"),
      ...mapToPatternItems(categoryMap, totalSuccess, "category"),
      ...mapToPatternItems(purposeMap, totalSuccess, "purpose"),
      ...mapToPatternItems(typeMap, totalSuccess, "profileType"),
      ...mapToPatternItems(prefectureMap, totalSuccess, "prefecture"),
      ...mapToPatternItems(scoreBandMap, totalSuccess, "scoreBand"),
    ].sort((a, b) => b.count - a.count);

    const topSuccessfulDrafts = [...successItems]
      .sort((a, b) => {
        const aScore =
          (a.outcome?.reservation === "あり" ? 1 : 0) +
          (a.outcome?.nomination === "あり" ? 1 : 0) +
          (a.outcome?.visit === "あり" ? 1 : 0);
        const bScore =
          (b.outcome?.reservation === "あり" ? 1 : 0) +
          (b.outcome?.nomination === "あり" ? 1 : 0) +
          (b.outcome?.visit === "あり" ? 1 : 0);
        return bScore - aScore || b.bodyScore - a.bodyScore;
      })
      .slice(0, 8);

    return {
      totalDrafts: drafts.length,
      totalUsed,
      totalSuccess,
      successRate: totalUsed > 0 ? Math.round((totalSuccess / totalUsed) * 100) : 0,
      allPatterns,
      topSuccessfulDrafts,
    };
  }, [drafts, outcomes]);

  const approvedCount = useMemo(
    () => Object.values(approvedPatterns).filter(Boolean).length,
    [approvedPatterns]
  );

  function toggleApproval(key: string) {
    const next = {
      ...approvedPatterns,
      [key]: !approvedPatterns[key],
    };
    setApprovedPatterns(next);
    localStorage.setItem("yorushokuApprovedPatterns", JSON.stringify(next));
    setSavedMessage("承認設定を保存しました");
    setTimeout(() => setSavedMessage(""), 1500);
  }

  const recentDrafts = useMemo(() => {
    return [...drafts].slice(0, 6);
  }, [drafts]);

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <AdminNotifier />
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
          <p className="text-sm font-medium text-[#a3476b]">管理画面</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                運用ダッシュボード
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66616d] sm:text-base">
                会員管理・利用権限・成功パターン承認・成果確認をまとめて管理する画面です。
              </p>
              {savedMessage && (
                <p className="mt-3 text-sm font-medium text-[#7a2e4d]">
                  {savedMessage}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <a
                href="/admin/members"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                会員一覧
              </a>
              <a
                href="#pattern-approval"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                承認管理
              </a>
              <a
                href="#result-analysis"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                成果分析
              </a>
              <a
                href="#system-status"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
              >
                システム状態
              </a>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">保存済み添削数</p>
            <p className="mt-3 text-3xl font-bold">{analysis.totalDrafts}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">使用済み件数</p>
            <p className="mt-3 text-3xl font-bold">{analysis.totalUsed}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">成功件数</p>
            <p className="mt-3 text-3xl font-bold">{analysis.totalSuccess}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">成功率</p>
            <p className="mt-3 text-3xl font-bold">{analysis.successRate}%</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">承認済みパターン</p>
            <p className="mt-3 text-3xl font-bold">{approvedCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">未承認パターン</p>
            <p className="mt-3 text-3xl font-bold">
              {Math.max(analysis.allPatterns.length - approvedCount, 0)}
            </p>
          </div>
          <div className={`rounded-[24px] p-5 shadow-sm ring-1 sm:col-span-2 xl:col-span-2 ${openAiBilling?.isAlert ? "bg-[#1e0a12] ring-[#5c1a2e]" : "bg-white ring-[#ebe7ef]"}`}>
            <p className={`text-sm ${openAiBilling?.isAlert ? "text-[#f87171]" : "text-[#66616d]"}`}>OpenAI残高</p>
            <p className={`mt-3 text-3xl font-bold ${openAiBilling?.isAlert ? "text-[#f87171]" : ""}`}>
              {openAiBilling ? `$${openAiBilling.remainingUsd.toFixed(2)}` : "—"}
            </p>
            {openAiBilling?.isAlert && <p className="mt-1 text-xs text-[#f87171]">⚠️ 残高が少なくなっています</p>}
            {openAiBilling && !openAiBilling.isAlert && <p className="mt-1 text-xs text-[#9b92a4]">今月使用: ${openAiBilling.usedUsd.toFixed(2)}</p>}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <div
              id="member-management"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#a3476b]">会員管理</p>
                  <h2 className="mt-2 text-2xl font-bold">管理メニュー</h2>
                </div>

                <a
                  href="/admin/members"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
                >
                  会員一覧ページへ
                </a>
              </div>

              <p className="mt-3 text-xs text-[#9b92a4]">ドラッグで並び替えできます</p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                {cardOrder.map((id) => {
                  const isOver = dragOverId === id;
                  const baseClass = `rounded-2xl border p-5 transition cursor-grab active:cursor-grabbing select-none ${isOver ? "border-[#a3476b] bg-[#fdf0f4]" : "border-[#ece7ef] bg-[#fcfbfd] hover:bg-white"}`;

                  if (id === "members") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <p className="text-sm font-semibold text-[#2c2933]">会員一覧</p>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">会員の追加、ログインID・パスワード確認、利用 / 利用停止の切替を行います。</p>
                      <a href="/admin/members" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "permissions") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <p className="text-sm font-semibold text-[#2c2933]">利用権限管理</p>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">契約中かどうか、使用可能かどうか、手動承認のON/OFFをここにまとめます。</p>
                      <a href="/admin/permissions" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "device") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <p className="text-sm font-semibold text-[#2c2933]">端末制限</p>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">1契約1端末管理、端末解除、再承認の導線をここに集約します。</p>
                      <a href="/admin/device" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "logs") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <p className="text-sm font-semibold text-[#2c2933]">管理者ログ</p>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">誰がどのパターンを承認したか、権限変更したかを記録する予定です。</p>
                      <a href="/admin/logs" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "inquiries") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#2c2933]">機能改善問合せ</p>
                        {unreadCount > 0 && (
                          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#e85d8a] px-1.5 text-xs font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">ユーザーからの機能改善リクエストを確認します。{unreadCount > 0 ? `未読 ${unreadCount}件があります。` : "未読なし。"}</p>
                      <a href="/admin/inquiries" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "patterns") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#2c2933]">AIパターン提案</p>
                        {pendingPatternCount > 0 && (
                          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#facc15] px-1.5 text-xs font-bold text-[#1c1001]">{pendingPatternCount}</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">AIが蓄積データから発見したパターン提案。良い・悪いで評価してください。{pendingPatternCount > 0 ? `確認待ち ${pendingPatternCount}件あります。` : "確認待ちなし。"}</p>
                      <a href="/admin/patterns" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "feedback") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#2c2933]">フィードバック分析</p>
                        <span className="rounded-full bg-[#f4e2ea] px-2 py-0.5 text-xs font-medium text-[#7a2e4d]">本音/建前</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">コピー行動（本音）と評価回答（建前）の2層でユーザー満足度を把握します。</p>
                      <a href="/admin/feedback" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "banners") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#2c2933]">バナー管理</p>
                        <span className="rounded-full bg-[#f4e2ea] px-2 py-0.5 text-xs font-medium text-[#7a2e4d]">広告</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">ダッシュボードに表示するアフィリエイトバナーを管理します。最大10件、スライド表示。</p>
                      <a href="/admin/banners" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] hover:bg-[#faf8fb]">開く</a>
                    </div>
                  );

                  if (id === "visitors") return (
                    <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => setDragOverId(null)} className={baseClass}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#2c2933]">サイト訪問者</p>
                        <span className="flex items-center gap-1 rounded-full bg-[#e8f7ee] px-2 py-0.5 text-xs font-medium text-[#1f7a43]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1f7a43] animate-pulse" />
                          リアルタイム {realtimeCount ?? "—"}人
                        </span>
                      </div>

                      {/* 期間タブ */}
                      <div className="mt-3 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                        {PERIOD_LABELS.map(({ id: pid, label }) => (
                          <button
                            key={pid}
                            type="button"
                            onClick={() => setVisitorPeriod(pid)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${visitorPeriod === pid ? "bg-[#a3476b] text-white" : "bg-white border border-[#d8d3dc] text-[#5d5965] hover:bg-[#faf8fb]"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* カスタム日付 */}
                      {visitorPeriod === "custom" && (
                        <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-[#d8d3dc] bg-white px-2 py-1 text-xs text-[#2c2933] outline-none focus:border-[#a3476b]" />
                          <span className="text-xs text-[#9b92a4]">〜</span>
                          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-[#d8d3dc] bg-white px-2 py-1 text-xs text-[#2c2933] outline-none focus:border-[#a3476b]" />
                        </div>
                      )}

                      <p className="mt-3 text-3xl font-bold text-[#2c2933]">
                        {visitorCount === null ? "—" : `${visitorCount.toLocaleString()}回`}
                      </p>
                      <p className="text-xs text-[#9b92a4]">{PERIOD_LABELS.find((p) => p.id === visitorPeriod)?.label}の訪問数</p>
                    </div>
                  );

                  return null;
                })}
              </div>
            </div>

            <div
              id="pattern-approval"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8"
            >
              <p className="text-sm font-medium text-[#a3476b]">成功パターン承認</p>
              <h2 className="mt-2 text-2xl font-bold">承認管理</h2>

              <div className="mt-5 space-y-4">
                {analysis.allPatterns.length > 0 ? (
                  analysis.allPatterns.slice(0, 30).map((item) => {
                    const approved = !!approvedPatterns[item.key];

                    return (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                                {getBadgeLabel(item.type)}
                              </span>
                              <span className="text-sm font-semibold text-[#2c2933]">
                                {item.label}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                              出現 {item.count} 件 / 成功全体の {item.rate}%
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleApproval(item.key)}
                            className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                              approved
                                ? "bg-[#a3476b] text-white hover:bg-[#8c3c5b]"
                                : "border border-[#d8d3dc] bg-white text-[#2c2933] hover:bg-[#faf8fb]"
                            }`}
                          >
                            {approved ? "採用中" : "採用する"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#66616d]">まだ成功データがありません。</p>
                )}
              </div>
            </div>

            <div
              id="result-analysis"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8"
            >
              <p className="text-sm font-medium text-[#a3476b]">成果確認</p>
              <h2 className="mt-2 text-2xl font-bold">成功した添削の上位</h2>

              <div className="mt-5 space-y-4">
                {analysis.topSuccessfulDrafts.length > 0 ? (
                  analysis.topSuccessfulDrafts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                          {item.category}
                        </span>
                        <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                          {item.industry || "未設定"}
                        </span>
                        <span className="text-sm font-semibold text-[#2e2a3b]">
                          {item.bodyScore}点
                        </span>
                      </div>

                      {item.title && (
                        <p className="mt-3 text-base font-bold text-[#2c2933]">
                          {item.title}
                        </p>
                      )}

                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                        {item.improvedText}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">まだ成功データがありません。</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6 xl:col-span-4">
            {/* 学習データ管理 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">AI学習データ管理</p>
              <p className="mt-1 text-xs text-[#7b7682]">追加したデータは即座に添削AIに反映されます</p>

              {/* タブ */}
              <div className="mt-4 flex gap-1 rounded-2xl bg-[#f3f0f6] p-1">
                {(["titles", "bodies", "ng"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLearnTab(tab)}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                      learnTab === tab
                        ? "bg-white text-[#a3476b] shadow-sm"
                        : "text-[#66616d] hover:text-[#2c2933]"
                    }`}
                  >
                    {tab === "titles" ? `良いタイトル（${goodTitles.length}）` : tab === "bodies" ? `良い本文（${goodBodies.length}）` : `NGワード（${ngWords.length}）`}
                  </button>
                ))}
              </div>

              {/* 良いタイトル */}
              {learnTab === "titles" && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGoodTitle())}
                      placeholder="予約に繋がったタイトルを入力"
                      className="h-11 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none focus:border-[#a3476b]"
                    />
                    <button
                      type="button"
                      onClick={addGoodTitle}
                      className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white"
                    >
                      追加
                    </button>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {goodTitles.length > 0 ? (
                      goodTitles.map((t, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] px-4 py-3">
                          <span className="text-sm text-[#2c2933]">{t}</span>
                          <button type="button" onClick={() => removeGoodTitle(i)} className="shrink-0 text-xs text-[#7a2e4d]">削除</button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#66616d]">まだ追加されていません</p>
                    )}
                  </div>
                </div>
              )}

              {/* 良い本文 */}
              {learnTab === "bodies" && (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={bodyInput}
                    onChange={(e) => setBodyInput(e.target.value)}
                    placeholder="予約・指名に繋がった本文を貼り付け"
                    className="min-h-[120px] w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 py-3 text-sm outline-none focus:border-[#a3476b]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addGoodBody}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#a3476b] px-5 text-sm font-semibold text-white"
                    >
                      追加
                    </button>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {goodBodies.length > 0 ? (
                      goodBodies.map((b, i) => (
                        <div key={i} className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] px-4 py-3">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-[#2c2933] line-clamp-4">{b}</p>
                          <button type="button" onClick={() => removeGoodBody(i)} className="mt-2 text-xs text-[#7a2e4d]">削除</button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#66616d]">まだ追加されていません</p>
                    )}
                  </div>
                </div>
              )}

              {/* NGワード */}
              {learnTab === "ng" && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={ngWordInput}
                      onChange={(e) => setNgWordInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNgWord())}
                      placeholder="例：激安、今すぐ、無料"
                      className="h-11 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none focus:border-[#a3476b]"
                    />
                    <button
                      type="button"
                      onClick={addNgWord}
                      className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white"
                    >
                      追加
                    </button>
                  </div>
                  <p className="text-xs text-[#7b7682]">日記削除リスクのある表現を登録。AIが添削時に使わなくなります。</p>
                  <div className="flex flex-wrap gap-2">
                    {ngWords.length > 0 ? (
                      ngWords.map((word) => (
                        <span key={word} className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf0f4] px-3 py-1.5 text-xs font-medium text-[#7a2e4d]">
                          {word}
                          <button type="button" onClick={() => removeNgWord(word)} className="text-[#a3476b] hover:text-[#7a2e4d]">×</button>
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-[#66616d]">まだNGワードがありません</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              id="system-status"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]"
            >
              <p className="text-sm font-medium text-[#a3476b]">システム状態</p>
              <div className="mt-4 space-y-3 text-sm text-[#5d5965]">
                <p>・診断結果保存：稼働中</p>
                <p>・添削履歴保存：稼働中</p>
                <p>・成果入力保存：稼働中</p>
                <p>・AI自動学習：稼働中（高スコア＋コピー文章を自動取得）</p>
                <p>・会員一覧UI：稼働中</p>
                {systemStatus === null ? (
                  <p>・DB接続：確認中…</p>
                ) : (
                  <p className={systemStatus.dbOk ? "text-[#1f7a43]" : "text-[#e85d8a]"}>
                    ・DB接続：{systemStatus.dbOk ? "稼働中 ✓" : "エラー ✗"}
                  </p>
                )}
                {systemStatus && (
                  <p className={systemStatus.openaiOk ? "text-[#1f7a43]" : "text-[#e85d8a]"}>
                    ・OpenAI API：{systemStatus.openaiOk ? "設定済み ✓" : "未設定 ✗"}
                  </p>
                )}
                {systemStatus && (
                  <p className={systemStatus.resendOk ? "text-[#1f7a43]" : "text-[#8b84a8]"}>
                    ・メール通知：{systemStatus.resendOk ? "設定済み ✓" : "未設定（任意）"}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">運用メモ</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5d5965]">
                <p>・AIはスコア70点以上の文章・コピーされた文章を自動学習します。使い続けるほど精度が上がります。</p>
                <p>・管理者の参考例・承認パターンは追加学習データとして統合されます。</p>
                <p>・会員一覧ページから利用停止や会員追加が行えます。</p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#a3476b]">会員管理ショートカット</p>
                <a
                  href="/admin/members"
                  className="text-sm font-semibold text-[#7a2e4d] hover:opacity-80"
                >
                  開く
                </a>
              </div>
              <div className="mt-4 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4">
                <p className="text-sm font-semibold text-[#2c2933]">会員一覧ページ</p>
                <p className="mt-2 text-sm leading-7 text-[#5d5965]">
                  ログインID・最新パスワード・利用状態の切替を確認できます。
                </p>
                <a
                  href="/admin/members"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
                >
                  会員一覧へ移動
                </a>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">最近の添削履歴</p>
              <div className="mt-4 space-y-3">
                {recentDrafts.length > 0 ? (
                  recentDrafts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                          {item.category}
                        </span>
                        <span className="text-xs text-[#7b7682]">
                          {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      {item.title && (
                        <p className="mt-3 text-sm font-semibold text-[#2c2933]">
                          {item.title}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5d5965]">
                        {item.improvedText}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">まだ履歴がありません。</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}