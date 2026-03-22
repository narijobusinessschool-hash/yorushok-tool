"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Suggestion = {
  id: string;
  pattern: string;
  evidence: string;
  category: string | null;
  confidence: number;
  status: "pending" | "good" | "bad";
  createdAt: string;
};

const CATEGORY_COLOR: Record<string, string> = {
  "写メ日記": "bg-[#f4e2ea] text-[#7a2e4d]",
  "オキニトーク": "bg-[#e2eaf4] text-[#2e4d7a]",
  "SNS": "bg-[#e2f4e8] text-[#2e7a4d]",
};

export default function PatternsPage() {
  const [pending, setPending] = useState<Suggestion[]>([]);
  const [good, setGood] = useState<Suggestion[]>([]);
  const [bad, setBad] = useState<Suggestion[]>([]);
  const [tab, setTab] = useState<"pending" | "good" | "bad">("pending");
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  async function fetchAll() {
    const [p, g, b] = await Promise.all([
      fetch("/api/admin/pattern-suggestions?status=pending").then((r) => r.json()),
      fetch("/api/admin/pattern-suggestions?status=good").then((r) => r.json()),
      fetch("/api/admin/pattern-suggestions?status=bad").then((r) => r.json()),
    ]);
    setPending(p.suggestions ?? []);
    setGood(g.suggestions ?? []);
    setBad(b.suggestions ?? []);
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    await fetch("/api/admin/pattern-suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate" }) });
    await fetchAll();
    setGenerating(false);
  }

  async function handleReview(id: string, status: "good" | "bad") {
    setReviewing(id);
    await fetch("/api/admin/pattern-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review", id, status }),
    });
    await fetchAll();
    setReviewing(null);
  }

  const tabs = [
    { key: "pending" as const, label: "確認待ち", count: pending.length, color: "text-[#facc15]" },
    { key: "good" as const, label: "採用 ✓", count: good.length, color: "text-[#4ade80]" },
    { key: "bad" as const, label: "却下 ✗", count: bad.length, color: "text-[#f87171]" },
  ];

  const currentList = tab === "pending" ? pending : tab === "good" ? good : bad;

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-[#8b84a8] hover:text-[#f2eefb] transition">← 管理画面</Link>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AIパターン提案</h1>
            <p className="mt-1 text-sm text-[#8b84a8]">AIが蓄積データから発見した効果的なパターン。良い・悪いで判断してください。</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 rounded-2xl bg-[#e85d8a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#d4507c] disabled:opacity-50"
          >
            {generating ? "分析中…" : "✦ 新たに分析"}
          </button>
        </div>

        {/* 説明 */}
        <div className="mt-4 rounded-2xl border border-[#231f36] bg-[#110e1c] p-4 text-sm leading-7 text-[#8b84a8]">
          <p>「採用」にしたパターンは、AIが添削時の<strong className="text-[#c8c2dc]">参考指針</strong>として使います（強制ではなく示唆）。</p>
          <p>「却下」にしたパターンは今後の提案から除外されます。時間があるときにチェックしてください。</p>
        </div>

        {/* タブ */}
        <div className="mt-6 flex gap-1 border-b border-[#231f36]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${tab === t.key ? "border-[#e85d8a] text-[#f2eefb]" : "border-transparent text-[#8b84a8] hover:text-[#f2eefb]"}`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`rounded-full bg-[#1a1420] px-1.5 py-0.5 text-xs font-bold ${t.color}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* リスト */}
        <div className="mt-4 space-y-3">
          {currentList.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[#4d4866] text-sm">
                {tab === "pending" ? "確認待ちのパターンはありません。「新たに分析」を押してAIに提案させてください。" : "まだありません"}
              </p>
            </div>
          )}
          {currentList.map((s) => (
            <div key={s.id} className={`rounded-2xl border p-5 transition ${s.status === "good" ? "border-[#1f7a43]/40 bg-[#052e16]/30" : s.status === "bad" ? "border-[#5c1a2e]/40 bg-[#3b0101]/10" : "border-[#231f36] bg-[#110e1c]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {s.category && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOR[s.category] ?? "bg-[#2f2a45] text-[#8b84a8]"}`}>{s.category}</span>
                    )}
                    <span className="text-xs text-[#4d4866]">確信度 {s.confidence}%</span>
                  </div>
                  <p className="text-sm font-semibold text-[#f2eefb] leading-6">{s.pattern}</p>
                  <p className="mt-2 text-xs leading-5 text-[#8b84a8]">{s.evidence}</p>
                </div>
              </div>

              {tab === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleReview(s.id, "good")}
                    disabled={reviewing === s.id}
                    className="flex-1 rounded-xl border border-[#1f7a43] py-2 text-sm font-medium text-[#4ade80] transition hover:bg-[#052e16] disabled:opacity-40"
                  >
                    ✓ 良い
                  </button>
                  <button
                    onClick={() => handleReview(s.id, "bad")}
                    disabled={reviewing === s.id}
                    className="flex-1 rounded-xl border border-[#5c1a2e] py-2 text-sm font-medium text-[#f87171] transition hover:bg-[#3b0101]/30 disabled:opacity-40"
                  >
                    ✗ 悪い
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
