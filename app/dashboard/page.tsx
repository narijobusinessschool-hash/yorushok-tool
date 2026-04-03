"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import UsageCounter from "@/components/UsageCounter";
import BannerSlider from "@/components/BannerSlider";

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

// 流れ文字のコピー（心理学的訴求）
const TICKER_TEXT = "✦ 1日あたりコーヒー1杯以下。でも、指名の差は何万円にもなる。（添削・動画・アーカイブ無制限）月額9,800円。";

const tickerText = Array(10).fill(TICKER_TEXT).join("　　　　");

export default function DashboardPage() {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const rawUser = localStorage.getItem("yorushokuCurrentUser");
      if (!rawUser) { setLoading(false); return; }
      const currentUser = JSON.parse(rawUser);
      setCurrentUserId(String(currentUser.id));

      const [{ data: allDrafts }, { data: allOutcomes }, { data: memberData }] = await Promise.all([
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
        supabase
          .from("members")
          .select("plan")
          .eq("id", currentUser.id)
          .single(),
      ]);

      setDrafts(allDrafts ?? []);
      setOutcomes(allOutcomes ?? []);
      setPlan(memberData?.plan ?? "free");
      setLoading(false);

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
  const successCount = outcomes.filter(
    (o) => o.reservation === "あり" || o.nomination === "あり" || o.visit === "あり"
  ).length;
  const avgScore =
    drafts.length > 0
      ? Math.round(drafts.reduce((sum, d) => sum + d.body_score, 0) / drafts.length)
      : 0;

  const recentDrafts = drafts.slice(0, 5);
  const isNbs = plan === "nbs";

  const stats = [
    { label: "今月の添削", value: loading ? "…" : String(thisMonthDrafts.length), unit: "回" },
    { label: "成果あり", value: loading ? "…" : String(successCount), unit: "件" },
    { label: "平均スコア", value: loading ? "…" : avgScore > 0 ? String(avgScore) : "–", unit: avgScore > 0 ? "点" : "" },
  ];

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">

      {/* 流れ文字告知バナー */}
      <div className="overflow-hidden border-b border-[#231f36] bg-[#0e0c18] py-2.5">
        <div className="animate-marquee inline-flex gap-0">
          <span className="text-xs font-medium text-[#c8c2dc] pr-16">{tickerText}</span>
          {/* シームレスループのため複製 */}
          <span className="text-xs font-medium text-[#c8c2dc] pr-16">{tickerText}</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">

        {/* ヘッダー */}
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-[#e85d8a] uppercase">Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">今日の文章を整えよう</h1>
        </header>

        {/* アフィリエイトバナー */}
        <BannerSlider />

        {/* 使用回数カウンター（freeプランのみ表示） */}
        {currentUserId && (
          <div className="mb-6">
            <UsageCounter memberId={currentUserId} />
          </div>
        )}

        {/* メインCTAボタン */}
        <a
          href="/dashboard/new"
          className="mb-4 flex items-center justify-between rounded-[20px] bg-[#e85d8a] px-6 py-5 transition active:scale-[0.98] hover:bg-[#d4507c]"
        >
          <div>
            <p className="text-sm font-semibold text-white/80">今すぐ始める</p>
            <p className="mt-0.5 text-lg font-bold text-white">写メ日記・オキニトークを添削する</p>
          </div>
          <span className="text-2xl text-white/80">→</span>
        </a>

        {/* アクセス解析ボタン（添削ボタン直下） */}
        {isNbs ? (
          <a
            href="/dashboard/access"
            className="mb-6 flex items-center justify-between rounded-[20px] border border-[#2f2a45] bg-[#110e1c] px-6 py-4 transition hover:border-[#3d3760] active:scale-[0.98]"
          >
            <div>
              <p className="text-xs font-semibold text-[#8b84a8]">NBS会員限定</p>
              <p className="mt-0.5 text-sm font-bold text-[#f2eefb]">アクセス解析を見る</p>
            </div>
            <span className="text-lg text-[#e85d8a]">→</span>
          </a>
        ) : (
          <div className="mb-6 flex items-center justify-between rounded-[20px] border border-[#231f36] bg-[#0e0c18] px-6 py-4 opacity-60 cursor-not-allowed">
            <div>
              <p className="text-xs font-semibold text-[#4d4866]">NBS会員限定</p>
              <p className="mt-0.5 text-sm font-bold text-[#4d4866]">アクセス解析を見る</p>
            </div>
            <span className="text-xl text-[#4d4866]">🔒</span>
          </div>
        )}

        {/* スタッツ */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[16px] border border-[#231f36] bg-[#110e1c] p-4">
              <p className="text-[11px] text-[#8b84a8]">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">
                {s.value}
                <span className="ml-0.5 text-sm font-normal text-[#8b84a8]">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* サブアクション */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {[
            { title: "成果を記録", desc: "使った文章の反応を入力", href: "/dashboard/results" },
            { title: "マイページ", desc: "診断結果やUSPを確認", href: "/mypage" },
          ].map((action) => (
            <a
              key={action.title}
              href={action.href}
              className="rounded-[16px] border border-[#231f36] bg-[#110e1c] p-4 transition hover:border-[#3d3760] active:scale-[0.98]"
            >
              <p className="font-bold">{action.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#8b84a8]">{action.desc}</p>
            </a>
          ))}
        </div>

        {/* 最近の履歴 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">最近の添削履歴</h2>
            <a href="/dashboard/results" className="text-sm text-[#e85d8a] hover:underline">
              すべて見る
            </a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-[16px] bg-[#110e1c]" />
              ))}
            </div>
          ) : recentDrafts.length > 0 ? (
            <div className="space-y-3">
              {recentDrafts.map((item) => (
                <div key={item.id} className="rounded-[16px] border border-[#231f36] bg-[#110e1c] p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#2a1420] px-2.5 py-0.5 text-xs font-semibold text-[#e85d8a]">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold text-[#e85d8a]">{item.body_score}点</span>
                    <span className="ml-auto text-xs text-[#4d4866]">
                      {new Date(item.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  {item.title && (
                    <p className="mt-2 text-sm font-semibold text-[#f2eefb]">{item.title}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8b84a8]">
                    {item.improved_text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-[#231f36] bg-[#110e1c] p-6 text-center">
              <p className="text-sm text-[#8b84a8]">まだ添削履歴がありません。</p>
              <a href="/dashboard/new" className="mt-2 inline-block text-sm font-semibold text-[#e85d8a]">
                最初の添削をはじめる →
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
