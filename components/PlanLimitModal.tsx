"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    supabase
      .from("draft_results")
      .select("body_score, created_at")
      .eq("member_id", memberId)
      .order("created_at", { ascending: true })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setHistory(
            data.map((d) => ({
              bodyScore: d.body_score ?? 0,
              createdAt: d.created_at,
            }))
          );
        }
      });
  }, [memberId]);

  const firstScore = history[0]?.bodyScore ?? null;
  const lastScore = history[history.length - 1]?.bodyScore ?? null;
  const diff = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">

        {/* スコア履歴 */}
        {history.length > 0 && (
          <div className="rounded-2xl bg-[#f8f4f7] p-4">
            <p className="text-sm font-semibold text-[#2c2933]">あなたのスコアの変化</p>
            <div className="mt-3 space-y-1">
              {history.map((h, i) => (
                <p key={i} className="text-sm text-[#5d5965]">
                  {i + 1}回目：本文スコア {h.bodyScore}点
                </p>
              ))}
            </div>
            {diff !== null && diff > 0 && (
              <p className="mt-3 text-sm font-bold text-[#a3476b]">
                → 本文スコアが +{diff}点 上がりました
              </p>
            )}
          </div>
        )}

        {/* NBS紹介 */}
        <div className="mt-5">
          <p className="text-lg font-bold text-[#2c2933]">
            NBS月額9,800円で無制限に使えます
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#5d5965]">
            <li>✅ 写メ日記添削AIツール（無制限）</li>
            <li>✅ 基礎から学べる動画コンテンツ</li>
            <li>✅ テキストコンテンツ</li>
            <li>✅ ライブアーカイブ</li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-[#6b6773]">
            指名1本 = 数万円。<br />
            月9,800円で毎月の指名が増えるなら、これは投資です。
          </p>
        </div>

        {/* ボタン */}
        <div className="mt-6 space-y-3">
          <a
            href={PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#a3476b] text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
          >
            今すぐ入会する →
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-2xl text-sm text-[#7b7682] transition hover:bg-[#f6f4f7]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
