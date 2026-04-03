"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function ResultsPage() {
  const [items, setItems] = useState<SavedDraftResult[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});
  const [savedId, setSavedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "effective" | "ineffective">("all");

  useEffect(() => {
    async function loadAll() {
      const rawUser = localStorage.getItem("yorushokuCurrentUser");
      if (!rawUser) { setLoading(false); return; }
      const currentUser = JSON.parse(rawUser);

      const { data: supabaseDrafts } = await supabase
        .from("draft_results")
        .select("*")
        .eq("member_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (supabaseDrafts && supabaseDrafts.length > 0) {
        setItems(supabaseDrafts.map((d) => ({
          id: d.id,
          createdAt: d.created_at,
          category: d.category,
          title: d.title,
          originalText: d.original_text,
          improvedText: d.improved_text,
          titleScore: d.title_score ?? undefined,
          bodyScore: d.body_score,
          profileTypeName: d.profile_type_name,
          industry: d.industry,
          prefecture: d.prefecture,
          purpose: d.purpose,
          status: d.status,
        })));

        const { data: supabaseOutcomes } = await supabase
          .from("draft_outcomes")
          .select("*")
          .eq("member_id", currentUser.id);
        if (supabaseOutcomes) {
          const map: OutcomeMap = {};
          supabaseOutcomes.forEach((o) => {
            map[o.draft_id] = { used: o.used, reservation: o.reservation, nomination: o.nomination, visit: o.visit, memo: o.memo, updatedAt: o.updated_at };
          });
          setOutcomes(map);
        }
      } else {
        const rawItems = localStorage.getItem("yorushokuDraftResults");
        const rawOutcomes = localStorage.getItem("yorushokuDraftOutcomes");
        if (rawItems) setItems(JSON.parse(rawItems));
        if (rawOutcomes) setOutcomes(JSON.parse(rawOutcomes));
      }
      setLoading(false);
    }
    loadAll();
  }, []);

  const stats = useMemo(() => {
    const values = Object.values(outcomes);
    const usedCount = values.filter((v) => v.used === "使った").length;
    const reservationCount = values.filter((v) => v.reservation === "あり").length;
    const nominationCount = values.filter((v) => v.nomination === "あり").length;
    const visitCount = values.filter((v) => v.visit === "あり").length;

    return { usedCount, reservationCount, nominationCount, visitCount };
  }, [outcomes]);

  // 効果ありの判定
  function isEffective(id: string) {
    const o = outcomes[id];
    if (!o) return false;
    return o.reservation === "あり" || o.nomination === "あり" || o.visit === "あり";
  }

  // フィルタ適用した添削一覧
  const filteredItems = useMemo(() => {
    if (filter === "effective") return items.filter((i) => isEffective(i.id));
    if (filter === "ineffective") return items.filter((i) => {
      const o = outcomes[i.id];
      return o?.used === "使った" && !isEffective(i.id);
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, outcomes, filter]);

  // 分析サマリー
  const analysis = useMemo(() => {
    const effective = items.filter((i) => isEffective(i.id));
    const ineffective = items.filter((i) => {
      const o = outcomes[i.id];
      return o?.used === "使った" && !isEffective(i.id);
    });

    const avgEffective = effective.length > 0
      ? Math.round(effective.reduce((s, i) => s + i.bodyScore, 0) / effective.length)
      : 0;
    const avgIneffective = ineffective.length > 0
      ? Math.round(ineffective.reduce((s, i) => s + i.bodyScore, 0) / ineffective.length)
      : 0;

    // カテゴリ別の成功率
    const categoryStats: Record<string, { total: number; success: number }> = {};
    items.forEach((i) => {
      const o = outcomes[i.id];
      if (!o || o.used !== "使った") return;
      if (!categoryStats[i.category]) categoryStats[i.category] = { total: 0, success: 0 };
      categoryStats[i.category].total++;
      if (isEffective(i.id)) categoryStats[i.category].success++;
    });

    return { effective: effective.length, ineffective: ineffective.length, avgEffective, avgIneffective, categoryStats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, outcomes]);

  async function updateOutcome(id: string, key: keyof DraftOutcome, value: string) {
    const next: OutcomeMap = {
      ...outcomes,
      [id]: {
        used: outcomes[id]?.used || "使ってない",
        reservation: outcomes[id]?.reservation || "なし",
        nomination: outcomes[id]?.nomination || "なし",
        visit: outcomes[id]?.visit || "なし",
        memo: outcomes[id]?.memo || "",
        updatedAt: new Date().toISOString(),
        [key]: value,
      } as DraftOutcome,
    };

    setOutcomes(next);

    const rawUser = localStorage.getItem("yorushokuCurrentUser");
    if (rawUser) {
      const currentUser = JSON.parse(rawUser);
      const o = next[id];
      await supabase.from("draft_outcomes").upsert({
        draft_id: id,
        member_id: currentUser.id,
        used: o.used,
        reservation: o.reservation,
        nomination: o.nomination,
        visit: o.visit,
        memo: o.memo,
        updated_at: o.updatedAt,
      });
    }

    setSavedId(id);
    setTimeout(() => setSavedId(""), 1400);
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <a href="/dashboard" className="text-sm text-[#a3476b] hover:underline">← ダッシュボード</a>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            成果を記録・分析する
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#66616d] sm:text-base">
            添削した文章の反応を記録して、効果パターンを見つけましょう。
          </p>
        </div>

        {/* 成果スタッツ */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">使用件数</p>
            <p className="mt-3 text-3xl font-bold">{stats.usedCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">予約あり</p>
            <p className="mt-3 text-3xl font-bold text-[#a3476b]">{stats.reservationCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">指名あり</p>
            <p className="mt-3 text-3xl font-bold text-[#a3476b]">{stats.nominationCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">来店あり</p>
            <p className="mt-3 text-3xl font-bold text-[#a3476b]">{stats.visitCount}</p>
          </div>
        </section>

        {/* 分析セクション */}
        {(analysis.effective > 0 || analysis.ineffective > 0) && (
          <section className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
            <h2 className="text-lg font-bold text-[#2c2933]">効果分析</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f0faf3] p-4">
                <p className="text-sm font-medium text-[#1f7a43]">効果あり</p>
                <p className="mt-1 text-2xl font-bold text-[#1f7a43]">{analysis.effective}件</p>
                {analysis.avgEffective > 0 && (
                  <p className="mt-1 text-xs text-[#3a9e5e]">平均スコア {analysis.avgEffective}点</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#fdf0f4] p-4">
                <p className="text-sm font-medium text-[#b03060]">効果なし</p>
                <p className="mt-1 text-2xl font-bold text-[#b03060]">{analysis.ineffective}件</p>
                {analysis.avgIneffective > 0 && (
                  <p className="mt-1 text-xs text-[#c85070]">平均スコア {analysis.avgIneffective}点</p>
                )}
              </div>
            </div>

            {/* カテゴリ別成功率 */}
            {Object.keys(analysis.categoryStats).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-[#2c2933]">カテゴリ別の成功率</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {Object.entries(analysis.categoryStats).map(([cat, s]) => (
                    <div key={cat} className="rounded-xl border border-[#ebe7ef] px-4 py-2">
                      <p className="text-xs text-[#66616d]">{cat}</p>
                      <p className="mt-0.5 text-sm font-bold">
                        {s.total > 0 ? Math.round((s.success / s.total) * 100) : 0}%
                        <span className="ml-1 text-xs font-normal text-[#9b92a4]">({s.success}/{s.total})</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 学習ヒント */}
            {analysis.effective > 0 && analysis.avgEffective > analysis.avgIneffective && (
              <div className="mt-4 rounded-xl bg-[#faf7fc] p-4">
                <p className="text-sm font-medium text-[#7a2e4d]">学習ポイント</p>
                <p className="mt-1 text-xs leading-5 text-[#66616d]">
                  効果ありの文章は平均{analysis.avgEffective}点、効果なしは平均{analysis.avgIneffective}点です。
                  スコア{analysis.avgEffective}点以上を目指すと成果につながりやすい傾向があります。
                </p>
              </div>
            )}
          </section>
        )}

        {/* フィルタ */}
        <div className="mt-6 flex items-center gap-2">
          {(["all", "effective", "ineffective"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === f
                  ? "bg-[#a3476b] text-white"
                  : "bg-white text-[#66616d] ring-1 ring-[#ebe7ef] hover:bg-[#faf7fc]"
              }`}
            >
              {f === "all" ? "すべて" : f === "effective" ? "効果あり" : "効果なし"}
            </button>
          ))}
          <span className="ml-2 text-xs text-[#9b92a4]">{filteredItems.length}件</span>
        </div>

        {/* 添削履歴＋成果入力 */}
        <section className="mt-4 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-[28px] bg-white" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm leading-7 text-[#66616d]">
                {filter !== "all"
                  ? "該当する添削結果がありません。"
                  : "まだ添削結果がありません。先に添削ページで文章を作成してください。"}
              </p>
              {filter === "all" && (
                <a href="/dashboard/new" className="mt-3 inline-block text-sm font-semibold text-[#a3476b] hover:underline">
                  添削をはじめる →
                </a>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const outcome = outcomes[item.id] || {
                used: "使ってない",
                reservation: "なし",
                nomination: "なし",
                visit: "なし",
                memo: "",
                updatedAt: "",
              };
              const effective = isEffective(item.id);

              return (
                <div
                  key={item.id}
                  className={`rounded-[28px] bg-white p-6 shadow-sm ring-1 ${
                    effective ? "ring-[#c3e6cb]" : "ring-[#ebe7ef]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                          {item.category}
                        </span>
                        <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                          {item.industry || "業種未設定"}
                        </span>
                        <span className="text-sm font-semibold text-[#2e2a3b]">
                          {item.bodyScore}点
                        </span>
                        {effective && (
                          <span className="rounded-full bg-[#e8f5ec] px-2.5 py-0.5 text-xs font-semibold text-[#1f7a43]">
                            効果あり
                          </span>
                        )}
                        <span className="ml-auto text-xs text-[#9b92a4]">
                          {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>

                      {item.title && (
                        <p className="mt-3 text-lg font-bold text-[#2c2933]">{item.title}</p>
                      )}

                      <p className="mt-2 line-clamp-3 text-sm leading-7 text-[#5d5965]">
                        {item.improvedText}
                      </p>
                    </div>

                    {savedId === item.id && (
                      <span className="shrink-0 rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                        保存済み
                      </span>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">使ったか</label>
                      <select
                        value={outcome.used}
                        onChange={(e) => updateOutcome(item.id, "used", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>使ってない</option>
                        <option>使った</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">予約</label>
                      <select
                        value={outcome.reservation}
                        onChange={(e) => updateOutcome(item.id, "reservation", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>なし</option>
                        <option>あり</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">指名</label>
                      <select
                        value={outcome.nomination}
                        onChange={(e) => updateOutcome(item.id, "nomination", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>なし</option>
                        <option>あり</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">来店</label>
                      <select
                        value={outcome.visit}
                        onChange={(e) => updateOutcome(item.id, "visit", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>なし</option>
                        <option>あり</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-[#2c2933]">メモ</label>
                    <textarea
                      value={outcome.memo}
                      onChange={(e) => updateOutcome(item.id, "memo", e.target.value)}
                      placeholder="例：反応は良かったが予約にはつながらなかった / 深夜送信だと反応が良い など"
                      className="min-h-[80px] w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
