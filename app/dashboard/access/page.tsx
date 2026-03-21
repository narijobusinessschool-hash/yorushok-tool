"use client";

import { useRef, useState } from "react";

type DailyData = {
  date: string;
  hits: number;
  dayOfWeek: string;
  note: string;
};

type AccessAnalysis = {
  period: string;
  stats: {
    max: { date: string; hits: number };
    avg: number;
    prevMonthAvg: number;
  };
  dailyData: DailyData[];
  patterns: {
    highAccessDays: string;
    lowAccessDays: string;
    weekdayRanking: string;
    eventEffect: string;
  };
  suggestions: { title: string; detail: string }[];
  urgentActions: string[];
  postingTiming: string;
};

export default function AccessAnalysisPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AccessAnalysis | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleAnalyze() {
    if (!image) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const res = await fetch("/api/analyze-access", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as AccessAnalysis);
    } catch (err) {
      setError(String(err).replace("Error: ", "") || "分析中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const maxHits = result
    ? Math.max(...(result.dailyData?.map((d) => d.hits) ?? [1]))
    : 1;

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#a3476b]">アクセス分析</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            アクセスデータを分析する
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#66616d]">
            DECOなどのアクセス統計画面をスクリーンショットして送ると、AI が傾向を読み取り投稿タイミングや改善提案を出します。
          </p>
        </div>

        {/* アップロードエリア */}
        {!result && (
          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
            <p className="text-sm font-medium text-[#a3476b]">スクリーンショットをアップロード</p>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !preview && inputRef.current?.click()}
              className={`mt-4 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
                preview
                  ? "border-[#a3476b] bg-[#fdf6f9] cursor-default"
                  : "border-[#d8d3dc] bg-[#fcfbfd] hover:border-[#a3476b] hover:bg-[#fdf6f9]"
              }`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="プレビュー"
                  className="max-h-[400px] w-auto rounded-xl object-contain"
                />
              ) : (
                <div className="text-center">
                  <p className="text-2xl">📊</p>
                  <p className="mt-3 text-sm font-medium text-[#2c2933]">
                    ここにドラッグ＆ドロップ
                  </p>
                  <p className="mt-1 text-xs text-[#7b7682]">または タップして選択</p>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {error && (
              <p className="mt-4 rounded-xl bg-[#fdf0f4] px-4 py-3 text-sm text-[#b03060]">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              {preview && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-5 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
                >
                  やり直す
                </button>
              )}
              <button
                type="button"
                onClick={image ? handleAnalyze : () => inputRef.current?.click()}
                disabled={loading}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#a3476b] text-sm font-semibold text-white transition hover:bg-[#8c3c5b] disabled:cursor-not-allowed disabled:bg-[#d2afbe]"
              >
                {loading
                  ? "AI分析中…"
                  : image
                  ? "このスクショを分析する"
                  : "スクリーンショットを選ぶ"}
              </button>
            </div>
          </div>
        )}

        {/* 分析結果 */}
        {result && (
          <div className="space-y-5">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-[#2c2933]">{result.period} の分析結果</p>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                別のスクショを分析
              </button>
            </div>

            {/* サマリーカード */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-[#ebe7ef] text-center">
                <p className="text-xs text-[#66616d]">今月最高</p>
                <p className="mt-2 text-2xl font-bold text-[#a3476b]">{result.stats.max.hits.toLocaleString()}</p>
                <p className="text-xs text-[#7b7682]">hit / {result.stats.max.date}</p>
              </div>
              <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-[#ebe7ef] text-center">
                <p className="text-xs text-[#66616d]">今月平均</p>
                <p className="mt-2 text-2xl font-bold">{result.stats.avg.toLocaleString()}</p>
                <p className="text-xs text-[#7b7682]">hit / 日</p>
              </div>
              <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-[#ebe7ef] text-center">
                <p className="text-xs text-[#66616d]">前月比</p>
                <p className={`mt-2 text-2xl font-bold ${
                  result.stats.prevMonthAvg > 0
                    ? result.stats.avg >= result.stats.prevMonthAvg
                      ? "text-[#1f7a43]"
                      : "text-[#b03060]"
                    : ""
                }`}>
                  {result.stats.prevMonthAvg > 0
                    ? `${result.stats.avg >= result.stats.prevMonthAvg ? "+" : ""}${Math.round(((result.stats.avg - result.stats.prevMonthAvg) / result.stats.prevMonthAvg) * 100)}%`
                    : "–"}
                </p>
                <p className="text-xs text-[#7b7682]">前月 {result.stats.prevMonthAvg > 0 ? `${result.stats.prevMonthAvg.toLocaleString()}hit` : "–"}</p>
              </div>
            </div>

            {/* 日別グラフ */}
            {result.dailyData && result.dailyData.length > 0 && (
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">日別アクセス</p>
                <div className="mt-4 space-y-2">
                  {result.dailyData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-right text-xs text-[#7b7682]">
                        {d.date}({d.dayOfWeek})
                      </span>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-6 flex-1 rounded-full bg-[#f3f0f6]">
                          <div
                            className="h-6 rounded-full bg-[#a3476b] transition-all"
                            style={{ width: `${Math.max((d.hits / maxHits) * 100, 2)}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-xs font-semibold text-[#2c2933]">
                          {d.hits.toLocaleString()}hit
                        </span>
                      </div>
                      {d.note && (
                        <span className="shrink-0 rounded-full bg-[#f4e2ea] px-2 py-0.5 text-xs text-[#7a2e4d]">
                          {d.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* パターン分析 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">アクセスパターン分析</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#2c2933]">高アクセス日の傾向</p>
                  <p className="mt-1 text-sm leading-7 text-[#5d5965]">{result.patterns.highAccessDays}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#2c2933]">低アクセス日の傾向</p>
                  <p className="mt-1 text-sm leading-7 text-[#5d5965]">{result.patterns.lowAccessDays}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#2c2933]">曜日別傾向</p>
                  <p className="mt-1 text-sm leading-7 text-[#5d5965]">{result.patterns.weekdayRanking}</p>
                </div>
                {result.patterns.eventEffect && (
                  <div>
                    <p className="text-xs font-semibold text-[#2c2933]">イベント・特定日の影響</p>
                    <p className="mt-1 text-sm leading-7 text-[#5d5965]">{result.patterns.eventEffect}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 投稿タイミング */}
            <div className="rounded-[28px] bg-[#fdf6f9] p-6 shadow-sm ring-1 ring-[#f4e2ea]">
              <p className="text-sm font-medium text-[#a3476b]">最適な投稿タイミング</p>
              <p className="mt-3 text-sm leading-7 text-[#5d5965]">{result.postingTiming}</p>
            </div>

            {/* 改善提案 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">改善提案</p>
              <div className="mt-4 space-y-4">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#a3476b] text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <p className="text-sm font-bold text-[#2c2933]">{s.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#5d5965]">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 今すぐできること */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">今すぐできること</p>
              <ul className="mt-4 space-y-3">
                {result.urgentActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-[#a3476b]">✓</span>
                    <span className="text-sm leading-7 text-[#5d5965]">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
            >
              別のスクリーンショットを分析する
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
