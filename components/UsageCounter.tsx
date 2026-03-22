"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PlanLimitModal from "@/components/PlanLimitModal";

type Props = {
  memberId: string | number;
};

export default function UsageCounter({ memberId }: Props) {
  const [plan, setPlan] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(3);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    supabase
      .from("members")
      .select("plan, usage_count, usage_limit")
      .eq("id", memberId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPlan(data.plan);
          setUsageCount(data.usage_count ?? 0);
          setUsageLimit(data.usage_limit ?? 3);
        }
      });
  }, [memberId]);

  // nbs会員には表示しない
  if (plan === null || plan === "nbs") return null;

  const remaining = usageLimit - usageCount;
  const isAtLimit = remaining <= 0;

  return (
    <>
      {showModal && (
        <PlanLimitModal memberId={memberId} onClose={() => setShowModal(false)} />
      )}

      <div
        className={`rounded-[20px] p-4 ring-1 ${
          isAtLimit
            ? "bg-[#fdf0f4] ring-[#f4c6d4]"
            : remaining === 1
            ? "bg-[#fff8ec] ring-[#f5d898]"
            : "bg-[#f1eff4] ring-[#ddd7e1]"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#2c2933]">
              {isAtLimit ? "無料体験の上限に達しました" : `無料添削 あと ${remaining} 回`}
            </p>
            <p className="mt-1 text-xs text-[#7b7682]">
              {isAtLimit
                ? "NBSに入会すると無制限で使えます。"
                : `${usageCount}/${usageLimit}回使用済み`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isAtLimit
                ? "bg-[#a3476b] text-white hover:bg-[#8c3c5b]"
                : "bg-white text-[#a3476b] ring-1 ring-[#d2a3b6] hover:bg-[#fdf0f4]"
            }`}
          >
            {isAtLimit ? "今すぐ入会 →" : "NBSとは？"}
          </button>
        </div>

        {/* プログレスバー */}
        {!isAtLimit && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e8e3ec]">
            <div
              className="h-full rounded-full bg-[#a3476b] transition-all"
              style={{ width: `${(usageCount / usageLimit) * 100}%` }}
            />
          </div>
        )}
      </div>
    </>
  );
}
