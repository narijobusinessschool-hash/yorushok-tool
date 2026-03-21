"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type DailyData = {
  date: string;
  hits: number;
  dayOfWeek: string;
  note: string;
};

type AccessAnalysis = {
  id?: string;
  period: string;
  stats: {
    max: { date: string; hits: number };
    avg: number;
    prevMonthAvg?: number;
  };
  dailyData: DailyData[];
  patterns: {
    highAccessDays: string;
    lowAccessDays: string;
    weekdayRanking: string;
    eventEffect: string;
    vsHistory?: string;
  };
  suggestions: { title: string; detail: string }[];
  urgentActions: string[];
  postingTiming: string;
  consultantMessage?: string;
  created_at?: string;
};

export default function AccessAnalysisPage() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [memberId, setMemberId] = useState<string | null>(null);

  // 新規分析
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AccessAnalysis | null>(null);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 履歴
  const [analyses, setAnalyses] = useState<AccessAnalysis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("yorushokuCurrentUser");
    if (raw) {
      const u = JSON.parse(raw);
      setMemberId(u.id);
      loadHistory(u.id);
    }
  }, []);

  async function loadHistory(mid: string) {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("access_analyses")
      .select("*")
      .eq("member_id", mid)
      .order("created_at", { ascending: false })
      .limit(24);
    if (data) {
      setAnalyses(
        data.map((d) => ({
          id: d.id,
          period: d.period,
          stats: d.stats,
          dailyData: d.daily_data ?? [],
          patterns: d.patterns ?? {},
          suggestions: d.suggestions ?? [],
          urgentActions: d.urgent_actions ?? [],
          postingTiming: d.posting_timing ?? "",
          created_at: d.created_at,
        }))
      );
    }
    setHistoryLoading(false);
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("画像ファイルを選択してください。");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setCurrentResult(null);
    setUploadError("");
  }

  async function handleAnalyze() {
    if (!image) return;
    setAnalyzing(true);
    setUploadError("");
    setCurrentResult(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      if (memberId) formData.append("memberId", memberId);

      const res = await fetch("/api/analyze-access", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCurrentResult(data as AccessAnalysis);
      if (memberId) await loadHistory(memberId);
    } catch (err) {
      setUploadError(String(err).replace("Error: ", ""));
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReset() {
    setImage(null);
    setPreview(null);
    setCurrentResult(null);
    setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const maxHits = currentResult
    ? Math.max(...(currentResult.dailyData?.map((d) => d.hits) ?? [1]))
    : 1;

  const tabs = [
    { key: "new", label: "新規分析" },
    { key: "history", label: `履歴・トレンド（${analyses.length}件）` },
  ] as const;

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-[#a3476b]">アクセス分析</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">アクセス分析</h1>
          <p className="mt-2 text-sm leading-7 text-[#66616d]">
            毎月のスクショを蓄積してAIが傾向を分析。改善提案と最適投稿タイミングをお伝えします。
          </p>
        </div>

        {/* タブ */}
        <div className="mb-6 flex gap-1 rounded-2xl bg-[#ece8f0] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition sm:text-sm ${
                tab === t.key
                  ? "bg-white text-[#a3476b] shadow-sm"
                  : "text-[#66616d] hover:text-[#2c2933]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== 新規分析タブ ===== */}
        {tab === "new" && (
          <div className="space-y-5">
            {!currentResult ? (
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
                <p className="text-sm font-medium text-[#a3476b]">スクリーンショットをアップロード</p>
                <p className="mt-1 text-xs text-[#7b7682]">
                  DECOなどのアクセス統計画面を撮影してください。複数月を蓄積するほど精度が上がります。
                </p>

                <div
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => !preview && inputRef.current?.click()}
                  className={`mt-4 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
                    preview
                      ? "border-[#a3476b] bg-[#fdf6f9] cursor-default"
                      : "border-[#d8d3dc] bg-[#fcfbfd] hover:border-[#a3476b] hover:bg-[#fdf6f9]"
                  }`}
                >
                  {preview ? (
                    <img src={preview} alt="プレビュー" className="max-h-[360px] w-auto rounded-xl object-contain" />
                  ) : (
                    <div className="text-center">
                      <p className="text-3xl">📊</p>
                      <p className="mt-3 text-sm font-medium text-[#2c2933]">ここにドラッグ or タップして選択</p>
                      <p className="mt-1 text-xs text-[#7b7682]">DECO・シティヘブン等のアクセス画面</p>
                    </div>
                  )}
                </div>

                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                {uploadError && (
                  <p className="mt-4 rounded-xl bg-[#fdf0f4] px-4 py-3 text-sm text-[#b03060]">{uploadError}</p>
                )}

                <div className="mt-5 flex gap-3">
                  {preview && (
                    <button type="button" onClick={handleReset}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-5 text-sm font-medium text-[#2c2933]">
                      やり直す
                    </button>
                  )}
                  <button type="button" onClick={image ? handleAnalyze : () => inputRef.current?.click()}
                    disabled={analyzing}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#a3476b] text-sm font-semibold text-white transition hover:bg-[#8c3c5b] disabled:bg-[#d2afbe]">
                    {analyzing ? "AI分析中…" : image ? "このスクショを分析する" : "スクリーンショットを選ぶ"}
                  </button>
                </div>

                {analyses.length > 0 && (
                  <p className="mt-4 text-center text-xs text-[#7b7682]">
                    蓄積データ {analyses.length}ヶ月分あり — 過去データを参考に比較分析します
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* AIメッセージ */}
                {currentResult.consultantMessage && (
                  <div className="rounded-[24px] bg-[#a3476b] p-5 text-white shadow-sm">
                    <p className="text-xs font-semibold opacity-75">AI分析コメント</p>
                    <p className="mt-2 text-sm leading-7">{currentResult.consultantMessage}</p>
                  </div>
                )}

                {/* サマリー */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-[#ebe7ef] text-center">
                    <p className="text-xs text-[#66616d]">最高</p>
                    <p className="mt-2 text-2xl font-bold text-[#a3476b]">{currentResult.stats.max.hits.toLocaleString()}</p>
                    <p className="text-xs text-[#7b7682]">hit / {currentResult.stats.max.date}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-[#ebe7ef] text-center">
                    <p className="text-xs text-[#66616d]">平均</p>
                    <p className="mt-2 text-2xl font-bold">{currentResult.stats.avg.toLocaleString()}</p>
                    <p className="text-xs text-[#7b7682]">hit / 日</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-[#ebe7ef] text-center">
                    <p className="text-xs text-[#66616d]">前月比</p>
                    <p className={`mt-2 text-2xl font-bold ${
                      currentResult.stats.prevMonthAvg && currentResult.stats.prevMonthAvg > 0
                        ? currentResult.stats.avg >= currentResult.stats.prevMonthAvg ? "text-[#1f7a43]" : "text-[#b03060]"
                        : ""
                    }`}>
                      {currentResult.stats.prevMonthAvg && currentResult.stats.prevMonthAvg > 0
                        ? `${currentResult.stats.avg >= currentResult.stats.prevMonthAvg ? "+" : ""}${Math.round(((currentResult.stats.avg - currentResult.stats.prevMonthAvg) / currentResult.stats.prevMonthAvg) * 100)}%`
                        : "–"}
                    </p>
                    <p className="text-xs text-[#7b7682]">前月 {currentResult.stats.prevMonthAvg ? `${currentResult.stats.prevMonthAvg}hit` : "–"}</p>
                  </div>
                </div>

                {/* 日別バー */}
                {currentResult.dailyData.length > 0 && (
                  <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                    <p className="text-sm font-medium text-[#a3476b]">日別アクセス</p>
                    <div className="mt-4 space-y-2">
                      {currentResult.dailyData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-18 shrink-0 text-right text-xs text-[#7b7682]">{d.date}({d.dayOfWeek})</span>
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-5 flex-1 rounded-full bg-[#f3f0f6]">
                              <div className="h-5 rounded-full bg-[#a3476b]"
                                style={{ width: `${Math.max((d.hits / maxHits) * 100, 2)}%` }} />
                            </div>
                            <span className="w-14 shrink-0 text-xs font-semibold">{d.hits.toLocaleString()}</span>
                          </div>
                          {d.note && (
                            <span className="shrink-0 rounded-full bg-[#f4e2ea] px-2 py-0.5 text-xs text-[#7a2e4d]">{d.note}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* パターン */}
                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                  <p className="text-sm font-medium text-[#a3476b]">アクセスパターン分析</p>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: "高アクセス日", value: currentResult.patterns.highAccessDays },
                      { label: "低アクセス日", value: currentResult.patterns.lowAccessDays },
                      { label: "曜日傾向", value: currentResult.patterns.weekdayRanking },
                      { label: "イベント影響", value: currentResult.patterns.eventEffect },
                      { label: "過去との比較", value: currentResult.patterns.vsHistory },
                    ].filter((item) => item.value).map((item) => (
                      <div key={item.label}>
                        <p className="text-xs font-semibold text-[#2c2933]">{item.label}</p>
                        <p className="mt-1 text-sm leading-7 text-[#5d5965]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 投稿タイミング */}
                <div className="rounded-[28px] bg-[#fdf6f9] p-5 ring-1 ring-[#f4e2ea]">
                  <p className="text-sm font-medium text-[#a3476b]">最適な投稿タイミング</p>
                  <p className="mt-2 text-sm leading-7 text-[#5d5965]">{currentResult.postingTiming}</p>
                </div>

                {/* 改善提案 */}
                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                  <p className="text-sm font-medium text-[#a3476b]">改善提案</p>
                  <div className="mt-4 space-y-3">
                    {currentResult.suggestions.map((s, i) => (
                      <div key={i} className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a3476b] text-xs font-bold text-white">{i + 1}</span>
                          <p className="text-sm font-bold text-[#2c2933]">{s.title}</p>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-[#5d5965]">{s.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 今すぐできること */}
                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                  <p className="text-sm font-medium text-[#a3476b]">今すぐできること</p>
                  <ul className="mt-4 space-y-2">
                    {currentResult.urgentActions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 text-[#a3476b]">✓</span>
                        <span className="text-sm leading-7 text-[#5d5965]">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button type="button" onClick={handleReset}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white text-sm font-medium text-[#2c2933]">
                  別のスクショを分析する
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== 履歴・トレンドタブ ===== */}
        {tab === "history" && (
          <div className="space-y-5">
            {historyLoading ? (
              <div className="rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm text-[#66616d]">読み込み中…</p>
              </div>
            ) : analyses.length === 0 ? (
              <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm text-[#66616d]">まだ分析データがありません。</p>
                <button type="button" onClick={() => setTab("new")}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white">
                  最初のスクショを分析する
                </button>
              </div>
            ) : (
              <>
                {/* 月別平均推移 */}
                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                  <p className="text-sm font-medium text-[#a3476b]">月別 平均アクセス推移</p>
                  <div className="mt-4 space-y-3">
                    {[...analyses].reverse().map((a, i, arr) => {
                      const maxAvg = Math.max(...arr.map((x) => x.stats.avg));
                      const pct = Math.max((a.stats.avg / maxAvg) * 100, 2);
                      const prev = i > 0 ? arr[i - 1].stats.avg : null;
                      const diff = prev ? a.stats.avg - prev : null;
                      return (
                        <div key={a.id ?? i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-[#2c2933]">{a.period}</span>
                            <div className="flex items-center gap-2">
                              {diff !== null && (
                                <span className={diff >= 0 ? "text-[#1f7a43]" : "text-[#b03060]"}>
                                  {diff >= 0 ? "+" : ""}{diff}hit
                                </span>
                              )}
                              <span className="font-bold text-[#2c2933]">{a.stats.avg.toLocaleString()}hit/日</span>
                            </div>
                          </div>
                          <div className="h-6 w-full rounded-full bg-[#f3f0f6]">
                            <div className="h-6 rounded-full bg-[#a3476b] transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 月別カード */}
                {analyses.map((a) => (
                  <div key={a.id} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#a3476b]">{a.period}</p>
                        <p className="mt-1 text-2xl font-bold">{a.stats.avg.toLocaleString()}<span className="text-sm font-normal text-[#7b7682]">hit/日</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#7b7682]">最高</p>
                        <p className="text-lg font-bold text-[#a3476b]">{a.stats.max?.hits?.toLocaleString()}hit</p>
                        <p className="text-xs text-[#7b7682]">{a.stats.max?.date}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-[#5d5965]">
                      {a.patterns.highAccessDays && (
                        <p><span className="font-semibold text-[#2c2933]">高アクセス：</span>{a.patterns.highAccessDays}</p>
                      )}
                      {a.postingTiming && (
                        <p><span className="font-semibold text-[#2c2933]">推奨投稿：</span>{a.postingTiming}</p>
                      )}
                      {a.patterns.vsHistory && (
                        <p className="rounded-xl bg-[#fdf6f9] px-3 py-2 text-xs text-[#7a2e4d]">
                          {a.patterns.vsHistory}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
