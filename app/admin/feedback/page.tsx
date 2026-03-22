"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RatingCount = { "使う予定": number; "たぶん使う": number; "使わない": number };
type RecentFeedback = {
  userId: string | null;
  rating: string | null;
  reason: string | null;
  improvedText: string | null;
  category: string | null;
  createdAt: string;
};
type RecentCopy = {
  userId: string | null;
  improvedText: string | null;
  category: string | null;
  createdAt: string;
};

type Stats = {
  totalCopies: number;
  totalFeedbacks: number;
  totalGenerates: number;
  copyRate: number;
  feedbackRate: number;
  ratingCount: RatingCount;
  reasonCount: Record<string, number>;
  categoryCount: Record<string, number>;
  recentFeedbacks: RecentFeedback[];
  recentCopies: RecentCopy[];
};

const RATING_COLOR: Record<string, string> = {
  "使う予定": "bg-[#4ade80] text-[#052e16]",
  "たぶん使う": "bg-[#facc15] text-[#1c1001]",
  "使わない": "bg-[#f87171] text-[#3b0101]",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function FeedbackPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"feedbacks" | "copies">("feedbacks");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/feedback-stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <main className="min-h-screen bg-[#09070f] text-[#f2eefb] flex items-center justify-center">
        <p className="text-[#8b84a8] text-sm">読み込み中…</p>
      </main>
    );
  }

  const totalRatings = Object.values(stats.ratingCount).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-[#8b84a8] hover:text-[#f2eefb] transition">← 管理画面</Link>
        </div>

        <h1 className="text-2xl font-bold">フィードバック分析</h1>
        <p className="mt-1 text-sm text-[#8b84a8]">本音シグナル（コピー行動）と建前シグナル（評価回答）の2層で品質を把握</p>

        {/* KPIカード */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "総添削数", value: stats.totalGenerates, unit: "回" },
            { label: "コピー率（本音）", value: `${stats.copyRate}`, unit: "%" },
            { label: "評価回答率", value: `${stats.feedbackRate}`, unit: "%" },
            { label: "評価総数", value: stats.totalFeedbacks, unit: "件" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
              <p className="text-xs text-[#8b84a8]">{k.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#f2eefb]">
                {k.value}<span className="ml-0.5 text-sm font-normal text-[#8b84a8]">{k.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* 評価分布 */}
        <div className="mt-6 rounded-2xl border border-[#231f36] bg-[#110e1c] p-6">
          <h2 className="text-sm font-semibold text-[#e85d8a]">「実際に使いそうですか？」回答分布</h2>
          <div className="mt-4 space-y-3">
            {(["使う予定", "たぶん使う", "使わない"] as const).map((r) => {
              const count = stats.ratingCount[r] ?? 0;
              const pct = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
              return (
                <div key={r}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-[#c8c2dc]">{r}</span>
                    <span className="font-semibold">{count}件 ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#231f36]">
                    <div
                      className={`h-full rounded-full transition-all ${r === "使う予定" ? "bg-[#4ade80]" : r === "たぶん使う" ? "bg-[#facc15]" : "bg-[#f87171]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 使わない理由 */}
        {Object.keys(stats.reasonCount).length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#231f36] bg-[#110e1c] p-6">
            <h2 className="text-sm font-semibold text-[#e85d8a]">「使わない」理由の内訳</h2>
            <div className="mt-4 space-y-2">
              {Object.entries(stats.reasonCount)
                .sort(([, a], [, b]) => b - a)
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-sm">
                    <span className="text-[#c8c2dc]">{reason}</span>
                    <span className="font-semibold text-[#f87171]">{count}件</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* カテゴリ別コピー */}
        {Object.keys(stats.categoryCount).length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#231f36] bg-[#110e1c] p-6">
            <h2 className="text-sm font-semibold text-[#e85d8a]">カテゴリ別コピー数</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.entries(stats.categoryCount).map(([cat, count]) => (
                <div key={cat} className="rounded-xl border border-[#2f2a45] px-4 py-2 text-sm">
                  <span className="text-[#8b84a8]">{cat}</span>
                  <span className="ml-2 font-bold">{count}件</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タブ: 最新データ */}
        <div className="mt-6">
          <div className="flex gap-2 border-b border-[#231f36] pb-0">
            {(["feedbacks", "copies"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setExpandedIdx(null); }}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${tab === t ? "border-[#e85d8a] text-[#e85d8a]" : "border-transparent text-[#8b84a8] hover:text-[#f2eefb]"}`}
              >
                {t === "feedbacks" ? `評価一覧（${stats.recentFeedbacks.length}件）` : `コピー一覧（${stats.recentCopies.length}件）`}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {tab === "feedbacks" && stats.recentFeedbacks.map((f, i) => (
              <div key={i} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {f.rating && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${RATING_COLOR[f.rating] ?? "bg-[#2f2a45] text-[#8b84a8]"}`}>
                        {f.rating}
                      </span>
                    )}
                    {f.reason && (
                      <span className="rounded-full border border-[#5c1a2e] px-2.5 py-0.5 text-xs text-[#f87171]">
                        {f.reason}
                      </span>
                    )}
                    {f.category && (
                      <span className="rounded-full border border-[#2f2a45] px-2.5 py-0.5 text-xs text-[#8b84a8]">
                        {f.category}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-[#4d4866]">{formatDate(f.createdAt)}</span>
                </div>
                {f.improvedText && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="text-xs text-[#8b84a8] hover:text-[#e85d8a] transition"
                    >
                      {expandedIdx === i ? "▲ 文章を隠す" : "▼ 生成文章を見る"}
                    </button>
                    {expandedIdx === i && (
                      <p className="mt-2 rounded-xl bg-[#0e0c18] px-4 py-3 text-sm leading-7 text-[#c8c2dc] whitespace-pre-wrap">
                        {f.improvedText}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {tab === "copies" && stats.recentCopies.map((c, i) => (
              <div key={i} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#4ade80]/10 px-2.5 py-0.5 text-xs font-bold text-[#4ade80]">コピー</span>
                    {c.category && (
                      <span className="rounded-full border border-[#2f2a45] px-2.5 py-0.5 text-xs text-[#8b84a8]">{c.category}</span>
                    )}
                  </div>
                  <span className="text-xs text-[#4d4866]">{formatDate(c.createdAt)}</span>
                </div>
                {c.improvedText && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i + 1000 ? null : i + 1000)}
                      className="text-xs text-[#8b84a8] hover:text-[#e85d8a] transition"
                    >
                      {expandedIdx === i + 1000 ? "▲ 文章を隠す" : "▼ コピーされた文章を見る"}
                    </button>
                    {expandedIdx === i + 1000 && (
                      <p className="mt-2 rounded-xl bg-[#0e0c18] px-4 py-3 text-sm leading-7 text-[#c8c2dc] whitespace-pre-wrap">
                        {c.improvedText}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {tab === "feedbacks" && stats.recentFeedbacks.length === 0 && (
              <p className="py-8 text-center text-sm text-[#4d4866]">まだフィードバックデータがありません</p>
            )}
            {tab === "copies" && stats.recentCopies.length === 0 && (
              <p className="py-8 text-center text-sm text-[#4d4866]">まだコピーデータがありません</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
