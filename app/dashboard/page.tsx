"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type DraftRow = {
  id: string;
  created_at: string;
  category: string;
  title: string;
  improved_text: string;
  body_score: number;
  status: string;
};

type OutcomeRow = {
  draft_id: string;
  used: string;
  reservation: string;
  nomination: string;
  visit: string;
};

export default function DashboardPage() {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const rawUser = localStorage.getItem("yorushokuCurrentUser");
      if (!rawUser) { setLoading(false); return; }
      const currentUser = JSON.parse(rawUser);

      const [{ data: allDrafts }, { data: allOutcomes }] = await Promise.all([
        supabase
          .from("draft_results")
          .select("id, created_at, category, title, improved_text, body_score, status")
          .eq("member_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("draft_outcomes")
          .select("draft_id, used, reservation, nomination, visit")
          .eq("member_id", currentUser.id),
      ]);

      setDrafts(allDrafts ?? []);
      setOutcomes(allOutcomes ?? []);
      setLoading(false);

      // localStorageにない場合は移行チェック（フォールバック）
      if (!allDrafts || allDrafts.length === 0) {
        const raw = localStorage.getItem("yorushokuDraftResults");
        if (raw) setDrafts(JSON.parse(raw).map((d: {
          id: string; createdAt: string; category: string; title: string;
          improvedText: string; bodyScore: number; status: string;
        }) => ({
          id: d.id, created_at: d.createdAt, category: d.category,
          title: d.title, improved_text: d.improvedText,
          body_score: d.bodyScore, status: d.status,
        })));
      }
    }
    load();
  }, []);

  const thisMonthDrafts = drafts.filter(
    (d) => new Date(d.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const usedCount = outcomes.filter((o) => o.used === "使った").length;
  const successCount = outcomes.filter(
    (o) => o.reservation === "あり" || o.nomination === "あり" || o.visit === "あり"
  ).length;
  const avgScore =
    drafts.length > 0
      ? Math.round(drafts.reduce((sum, d) => sum + d.body_score, 0) / drafts.length)
      : 0;

  const recentDrafts = drafts.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#a3476b]">ダッシュボード</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              今日の文章を整えましょう
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#66616d]">
              添削、履歴確認、成果入力、診断結果の確認をここから行えます。
            </p>
          </div>
          <a
            href="/dashboard/new"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
          >
            新しく添削する
          </a>
        </header>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">今月の添削回数</p>
            <p className="mt-3 text-3xl font-bold">{loading ? "…" : thisMonthDrafts.length}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">使用回数</p>
            <p className="mt-3 text-3xl font-bold">{loading ? "…" : usedCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">成果あり件数</p>
            <p className="mt-3 text-3xl font-bold">{loading ? "…" : successCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">平均スコア</p>
            <p className="mt-3 text-3xl font-bold">{loading ? "…" : avgScore > 0 ? `${avgScore}点` : "–"}</p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: "新しく添削する", description: "掲載予定の文章を入力して、予約導線を強化します。", href: "/dashboard/new" },
            { title: "成果を記録する", description: "使った文章の反応を入力して、提案精度を高めます。", href: "/dashboard/results" },
            { title: "マイページを見る", description: "診断結果やUSP・STPの整理内容をいつでも見返せます。", href: "/mypage" },
          ].map((action) => (
            <a
              key={action.title}
              href={action.href}
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-xl font-bold">{action.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#66616d]">{action.description}</p>
            </a>
          ))}
        </section>

        <section className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">最近の添削履歴</h2>
            <a href="/dashboard/results" className="text-sm font-medium text-[#7a2e4d] hover:opacity-80">
              すべて見る
            </a>
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-[#66616d]">読み込み中…</p>
            ) : recentDrafts.length > 0 ? (
              recentDrafts.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-[#ece7ef] bg-[#fcfbfd] p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                      {item.category}
                    </span>
                    <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                      {item.status}
                    </span>
                    <span className="text-sm font-semibold text-[#2e2a3b]">{item.body_score}点</span>
                    <span className="ml-auto text-xs text-[#9b92a4]">
                      {new Date(item.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  {item.title && (
                    <p className="mt-3 text-sm font-bold text-[#2c2933]">{item.title}</p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-[#585460]">
                    {item.improved_text}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#66616d]">
                まだ添削履歴がありません。
                <a href="/dashboard/new" className="ml-1 font-semibold text-[#a3476b]">
                  最初の添削をはじめる
                </a>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
