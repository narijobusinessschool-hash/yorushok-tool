"use client";

import { useEffect, useMemo, useState } from "react";

type SavedDraftResult = {
  id: string;
  createdAt: string;
  category: "写メ日記" | "オキニトーク" | "SNS";
  title: string;
  originalText: string;
  improvedText: string;
  titleScore?: number;
  bodyScore: number;
  profileTypeName: string;
  industry: string;
  prefecture: string;
  purpose?: string;
  status: "下書き" | "使用済み";
};

type DraftOutcome = {
  used: "使った" | "使ってない";
  reservation: "あり" | "なし";
  nomination: "あり" | "なし";
  visit: "あり" | "なし";
  memo: string;
  updatedAt: string;
};

type OutcomeMap = Record<string, DraftOutcome>;

export default function ResultsPage() {
  const [items, setItems] = useState<SavedDraftResult[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});
  const [savedId, setSavedId] = useState("");

  useEffect(() => {
    const rawItems = localStorage.getItem("yorushokuDraftResults");
    const rawOutcomes = localStorage.getItem("yorushokuDraftOutcomes");

    if (rawItems) {
      setItems(JSON.parse(rawItems));
    }
    if (rawOutcomes) {
      setOutcomes(JSON.parse(rawOutcomes));
    }
  }, []);

  const stats = useMemo(() => {
    const values = Object.values(outcomes);
    const usedCount = values.filter((v) => v.used === "使った").length;
    const reservationCount = values.filter((v) => v.reservation === "あり").length;
    const nominationCount = values.filter((v) => v.nomination === "あり").length;
    const visitCount = values.filter((v) => v.visit === "あり").length;

    return {
      usedCount,
      reservationCount,
      nominationCount,
      visitCount,
    };
  }, [outcomes]);

  function updateOutcome(
    id: string,
    key: keyof DraftOutcome,
    value: string
  ) {
    const next: OutcomeMap = {
      ...outcomes,
      [id]: {
        used: outcomes[id]?.used || "使ってない",
        reservation: outcomes[id]?.reservation || "なし",
        nomination: outcomes[id]?.nomination || "なし",
        visit: outcomes[id]?.visit || "なし",
        memo: outcomes[id]?.memo || "",
        updatedAt: new Date().toISOString(),
        [key]: value,
      } as DraftOutcome,
    };

    setOutcomes(next);
    localStorage.setItem("yorushokuDraftOutcomes", JSON.stringify(next));
    setSavedId(id);
    setTimeout(() => setSavedId(""), 1400);
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#a3476b]">成果入力</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            添削結果の反応を記録する
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#66616d] sm:text-base">
            使ったかどうか、予約・指名・来店につながったかを記録して、成功パターンの土台にします。
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">使用件数</p>
            <p className="mt-3 text-3xl font-bold">{stats.usedCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">予約あり</p>
            <p className="mt-3 text-3xl font-bold">{stats.reservationCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">指名あり</p>
            <p className="mt-3 text-3xl font-bold">{stats.nominationCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">来店あり</p>
            <p className="mt-3 text-3xl font-bold">{stats.visitCount}</p>
          </div>
        </section>

        <section className="mt-6 space-y-6">
          {items.length === 0 ? (
            <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm leading-7 text-[#66616d]">
                まだ添削結果の保存がありません。先に新規添削ページで文章を作成してください。
              </p>
            </div>
          ) : (
            items.map((item) => {
              const outcome = outcomes[item.id] || {
                used: "使ってない",
                reservation: "なし",
                nomination: "なし",
                visit: "なし",
                memo: "",
                updatedAt: "",
              };

              return (
                <div
                  key={item.id}
                  className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                          {item.category}
                        </span>
                        <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                          {item.industry || "業種未設定"}
                        </span>
                        <span className="text-sm font-semibold text-[#2e2a3b]">
                          {item.bodyScore}点
                        </span>
                      </div>

                      {item.title && (
                        <p className="mt-3 text-lg font-bold text-[#2c2933]">
                          {item.title}
                        </p>
                      )}

                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                        {item.improvedText}
                      </p>

                      <p className="mt-3 text-xs text-[#7b7682]">
                        保存日時：{new Date(item.createdAt).toLocaleString("ja-JP")}
                      </p>
                    </div>

                    {savedId === item.id && (
                      <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                        保存済み
                      </span>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        使ったか
                      </label>
                      <select
                        value={outcome.used}
                        onChange={(e) => updateOutcome(item.id, "used", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>使ってない</option>
                        <option>使った</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        予約
                      </label>
                      <select
                        value={outcome.reservation}
                        onChange={(e) =>
                          updateOutcome(item.id, "reservation", e.target.value)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>なし</option>
                        <option>あり</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        指名
                      </label>
                      <select
                        value={outcome.nomination}
                        onChange={(e) =>
                          updateOutcome(item.id, "nomination", e.target.value)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>なし</option>
                        <option>あり</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                        来店
                      </label>
                      <select
                        value={outcome.visit}
                        onChange={(e) => updateOutcome(item.id, "visit", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>なし</option>
                        <option>あり</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                      メモ
                    </label>
                    <textarea
                      value={outcome.memo}
                      onChange={(e) => updateOutcome(item.id, "memo", e.target.value)}
                      placeholder="例：反応は良かったが予約にはつながらなかった / 深夜送信だと反応が良い など"
                      className="min-h-[100px] w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}