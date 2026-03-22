"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { gaUpgradePromptView, gaUpgradeClick } from "@/lib/ga";

const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL ?? "https://getsugaku-panda.jp/subscription/apply/16527";

type ScoreHistory = {
  bodyScore: number;
  createdAt: string;
};

type Props = {
  memberId: string | number;
  onClose: () => void;
};

export default function PlanLimitModal({ memberId, onClose }: Props) {
  const [history, setHistory] = useState<ScoreHistory[]>([]);

  // モーダル表示を計測
  useEffect(() => {
    gaUpgradePromptView("plan_limit_modal");
  }, []);

  useEffect(() => {
    supabase
      .from("draft_results")
      .select("body_score, created_at")
      .eq("member_id", memberId)
      .order("created_at", { ascending: true })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setHistory(data.map((d) => ({
            bodyScore: d.body_score ?? 0,
            createdAt: d.created_at,
          })));
        }
      });
  }, [memberId]);

  const firstScore = history[0]?.bodyScore ?? null;
  const lastScore = history[history.length - 1]?.bodyScore ?? null;
  const diff = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-0 pb-0 sm:items-center sm:px-4 sm:pb-4">
      <div className="w-full max-w-md rounded-t-[28px] border border-[#231f36] bg-[#110e1c] p-6 sm:rounded-[28px] sm:p-8">

        {/* スコア履歴 */}
        {history.length > 0 && (
          <div className="rounded-[16px] border border-[#231f36] bg-[#0e0c18] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8b84a8]">あなたのスコアの変化</p>
            <div className="mt-3 space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[#8b84a8]">{i + 1}回目</span>
                  <span className="font-bold text-[#f2eefb]">{h.bodyScore}<span className="ml-0.5 text-xs font-normal text-[#8b84a8]">点</span></span>
                </div>
              ))}
            </div>
            {diff !== null && diff > 0 && (
              <div className="mt-3 rounded-xl bg-[#1a1420] px-3 py-2">
                <p className="text-sm font-bold text-[#e85d8a]">→ スコアが +{diff}点 上がりました</p>
              </div>
            )}
          </div>
        )}

        {/* NBS紹介 */}
        <div className="mt-5">
          <p className="text-xl font-bold text-[#f2eefb]">NBS月額9,800円で<br />無制限に使えます</p>
          <ul className="mt-4 space-y-2.5">
            {[
              "写メ日記添削AIツール（無制限）",
              "基礎から学べる動画コンテンツ",
              "テキストコンテンツ",
              "ライブアーカイブ",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-[#c8c2dc]">
                <span className="text-[#4ade80]">✓</span>{item}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-[12px] border border-[#2f2a45] bg-[#0e0c18] px-4 py-3 text-sm leading-6 text-[#8b84a8]">
            指名1本 = 数万円。月9,800円で毎月の指名が増えるなら、これは投資です。
          </p>
        </div>

        {/* ボタン */}
        <div className="mt-6 space-y-3">
          <a
            href={PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => gaUpgradeClick("plan_limit_modal")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#e85d8a] py-4 text-sm font-bold text-white transition hover:bg-[#d4507c] active:scale-[0.98]"
          >
            今すぐ入会する →
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 text-sm text-[#8b84a8] transition hover:text-[#f2eefb]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
