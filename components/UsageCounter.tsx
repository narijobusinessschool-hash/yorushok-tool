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

  if (plan === null || plan === "nbs") return null;

  const remaining = usageLimit - usageCount;
  const isAtLimit = remaining <= 0;
  const pct = Math.min((usageCount / usageLimit) * 100, 100);

  return (
    <>
      {showModal && (
        <PlanLimitModal memberId={memberId} onClose={() => setShowModal(false)} />
      )}

      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`w-full rounded-[16px] border p-4 text-left transition active:scale-[0.98] ${
          isAtLimit
            ? "border-[#5c1a2e] bg-[#1e0a12]"
            : "border-[#231f36] bg-[#110e1c] hover:border-[#3d3760]"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={`text-sm font-semibold ${isAtLimit ? "text-[#f87171]" : "text-[#f2eefb]"}`}>
              {isAtLimit ? "無料添削の上限に達しました" : `無料添削 あと ${remaining} 回使えます`}
            </p>
            <p className="mt-0.5 text-xs text-[#8b84a8]">
              {isAtLimit
                ? "NBSに入会すると無制限で使えます → タップで詳細"
                : `${usageCount}/${usageLimit}回使用済み`}
            </p>
          </div>
          <span className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold ${
            isAtLimit ? "bg-[#e85d8a] text-white" : "border border-[#2f2a45] text-[#e85d8a]"
          }`}>
            {isAtLimit ? "入会する" : "詳細"}
          </span>
        </div>

        {!isAtLimit && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#231f36]">
            <div
              className="h-full rounded-full bg-[#e85d8a] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </button>
    </>
  );
}
