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
  copyType: string | null;
  title: string | null;
  category: string | null;
  createdAt: string;
};
type ReferenceItem = {
  id: string;
  created_at: string;
  meta: { category: string; title: string; body: string };
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
const CATEGORIES = ["写メ日記", "オキニトーク", "SNS"] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function FeedbackPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"feedbacks" | "copies" | "reference">("feedbacks");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // 参考例
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [refCategoryTab, setRefCategoryTab] = useState<typeof CATEGORIES[number]>("写メ日記");

  // 追加モーダル
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/admin/feedback-stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(() => {
    if (tab === "reference") fetchReferences();
  }, [tab]);

  async function fetchReferences() {
    const r = await fetch("/api/admin/reference");
    const json = await r.json();
    setReferences(json.items ?? []);
  }

  function openAddModal(text: string, category: string | null) {
    setAddText(text);
    setAddTitle("");
    setAddCategory(category ?? "写メ日記");
    setShowAddModal(true);
  }

  async function handleAdd() {
    if (!addText.trim()) return;
    setAdding(true);
    await fetch("/api/admin/reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: addCategory, title: addTitle, text: addText }),
    });
    setAdding(false);
    setShowAddModal(false);
    if (tab === "reference") fetchReferences();
  }

  async function handleDelete(id: string) {
    await fetch("/api/admin/reference", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }

  if (!stats) {
    return (
      <main className="min-h-screen bg-[#09070f] text-[#f2eefb] flex items-center justify-center">
        <p className="text-[#8b84a8] text-sm">読み込み中…</p>
      </main>
    );
  }

  const totalRatings = Object.values(stats.ratingCount).reduce((a, b) => a + b, 0);
  const filteredRefs = references.filter((r) => r.meta?.category === refCategoryTab);

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

        {/* タブ */}
        <div className="mt-6">
          <div className="flex gap-2 border-b border-[#231f36] pb-0">
            {(["feedbacks", "copies", "reference"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setExpandedIdx(null); }}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${tab === t ? "border-[#e85d8a] text-[#e85d8a]" : "border-transparent text-[#8b84a8] hover:text-[#f2eefb]"}`}
              >
                {t === "feedbacks" ? `評価一覧（${stats.recentFeedbacks.length}件）`
                  : t === "copies" ? `コピー一覧（${stats.recentCopies.length}件）`
                  : `参考例（${references.length}件）`}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {/* 評価一覧 */}
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
                  <div className="flex shrink-0 items-center gap-2">
                    {f.improvedText && (
                      <button
                        onClick={() => openAddModal(f.improvedText!, f.category)}
                        className="rounded-full border border-[#3d1429] bg-[#1e0a12] px-3 py-1 text-xs font-semibold text-[#e85d8a] hover:bg-[#2a0f1a] transition"
                      >
                        ＋ 参考に追加
                      </button>
                    )}
                    <span className="text-xs text-[#4d4866]">{formatDate(f.createdAt)}</span>
                  </div>
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

            {/* コピー一覧 */}
            {tab === "copies" && stats.recentCopies.map((c, i) => (
              <div key={i} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#4ade80]/10 px-2.5 py-0.5 text-xs font-bold text-[#4ade80]">コピー</span>
                    <span className="rounded-full bg-[#2f2a45] px-2.5 py-0.5 text-xs font-semibold text-[#c8c2dc]">
                      {c.copyType === "title" ? "タイトル" : "本文"}
                    </span>
                    {c.category && (
                      <span className="rounded-full border border-[#2f2a45] px-2.5 py-0.5 text-xs text-[#8b84a8]">{c.category}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.improvedText && (
                      <button
                        onClick={() => openAddModal(c.improvedText!, c.category)}
                        className="rounded-full border border-[#3d1429] bg-[#1e0a12] px-3 py-1 text-xs font-semibold text-[#e85d8a] hover:bg-[#2a0f1a] transition"
                      >
                        ＋ 参考に追加
                      </button>
                    )}
                    <span className="text-xs text-[#4d4866]">{formatDate(c.createdAt)}</span>
                  </div>
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
                      <div className="mt-2 space-y-2">
                        {c.title && (
                          <div>
                            <p className="mb-1 text-xs text-[#8b84a8]">タイトル</p>
                            <p className="rounded-xl bg-[#0e0c18] px-4 py-2 text-sm font-semibold text-[#f2eefb]">{c.title}</p>
                          </div>
                        )}
                        <div>
                          {c.title && <p className="mb-1 text-xs text-[#8b84a8]">{c.copyType === "title" ? "コピーされたタイトル" : "本文"}</p>}
                          <p className="rounded-xl bg-[#0e0c18] px-4 py-3 text-sm leading-7 text-[#c8c2dc] whitespace-pre-wrap">
                            {c.improvedText}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* 参考例 */}
            {tab === "reference" && (
              <div>
                {/* カテゴリタブ */}
                <div className="mb-4 flex gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setRefCategoryTab(cat)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${refCategoryTab === cat ? "bg-[#e85d8a] text-white" : "border border-[#2f2a45] text-[#8b84a8] hover:text-[#f2eefb]"}`}
                    >
                      {cat}
                      <span className="ml-1.5 text-xs opacity-70">
                        {references.filter((r) => r.meta?.category === cat).length}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredRefs.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full border border-[#2f2a45] px-2.5 py-0.5 text-xs text-[#8b84a8]">
                          {item.meta.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#4d4866]">{formatDate(item.created_at)}</span>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-full border border-[#3b0101] px-3 py-1 text-xs text-[#f87171] hover:bg-[#3b0101]/20 transition"
                          >
                            削除
                          </button>
                        </div>
                      </div>

                      {item.meta.category === "写メ日記" ? (
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="mb-1 text-xs text-[#8b84a8]">タイトル</p>
                            <p className="rounded-xl bg-[#0e0c18] px-4 py-2 text-sm font-semibold text-[#f2eefb]">
                              {item.meta.title || "（タイトルなし）"}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-[#8b84a8]">本文</p>
                            <p className="rounded-xl bg-[#0e0c18] px-4 py-3 text-sm leading-7 text-[#c8c2dc] whitespace-pre-wrap">
                              {item.meta.body}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl bg-[#0e0c18] px-4 py-3 text-sm leading-7 text-[#c8c2dc] whitespace-pre-wrap">
                          {item.meta.body}
                        </p>
                      )}
                    </div>
                  ))}

                  {filteredRefs.length === 0 && (
                    <p className="py-8 text-center text-sm text-[#4d4866]">
                      {refCategoryTab} の参考例がまだありません
                    </p>
                  )}
                </div>
              </div>
            )}

            {tab === "feedbacks" && stats.recentFeedbacks.length === 0 && (
              <p className="py-8 text-center text-sm text-[#4d4866]">まだフィードバックデータがありません</p>
            )}
            {tab === "copies" && stats.recentCopies.length === 0 && (
              <p className="py-8 text-center text-sm text-[#4d4866]">まだコピーデータがありません</p>
            )}
          </div>
        </div>
      </div>

      {/* 参考に追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-lg rounded-[24px] border border-[#231f36] bg-[#110e1c] p-6 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1e1a2e] text-[#8b84a8] hover:text-[#f2eefb] transition"
            >
              ✕
            </button>
            <h2 className="mb-5 text-base font-bold text-[#f2eefb]">参考例として追加</h2>

            {/* カテゴリ選択 */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs text-[#8b84a8]">カテゴリ</label>
              <div className="flex gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAddCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${addCategory === cat ? "bg-[#e85d8a] text-white" : "border border-[#2f2a45] text-[#8b84a8] hover:text-[#f2eefb]"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* タイトル（写メ日記のみ） */}
            {addCategory === "写メ日記" && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs text-[#8b84a8]">タイトル</label>
                <input
                  type="text"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="タイトルを入力（任意）"
                  className="w-full rounded-xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-2.5 text-sm text-[#f2eefb] placeholder-[#4d4866] outline-none focus:border-[#e85d8a]/50"
                />
              </div>
            )}

            {/* 本文 */}
            <div className="mb-5">
              <label className="mb-1.5 block text-xs text-[#8b84a8]">本文</label>
              <textarea
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-3 text-sm leading-7 text-[#c8c2dc] outline-none focus:border-[#e85d8a]/50 resize-none"
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={adding || !addText.trim()}
              className="w-full rounded-2xl bg-[#e85d8a] py-3 text-sm font-bold text-white transition hover:bg-[#d44d78] disabled:opacity-50"
            >
              {adding ? "追加中…" : "参考例に追加する"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
