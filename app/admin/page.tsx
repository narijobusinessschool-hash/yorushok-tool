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
type ApprovedPatternMap = Record<string, boolean>;

type PatternItem = {
  key: string;
  type: "industry" | "category" | "purpose" | "profileType" | "prefecture" | "scoreBand";
  label: string;
  count: number;
  rate: number;
};

function buildCountMap(items: string[]) {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    if (!item) return;
    map[item] = (map[item] || 0) + 1;
  });
  return map;
}

function mapToPatternItems(
  map: Record<string, number>,
  total: number,
  type: PatternItem["type"]
): PatternItem[] {
  return Object.entries(map)
    .map(([label, count]) => ({
      key: `${type}:${label}`,
      type,
      label,
      count,
      rate: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function getScoreBand(score: number) {
  if (score >= 90) return "90点以上";
  if (score >= 80) return "80〜89点";
  if (score >= 70) return "70〜79点";
  if (score >= 60) return "60〜69点";
  return "60点未満";
}

function getBadgeLabel(type: PatternItem["type"]) {
  if (type === "industry") return "業種";
  if (type === "category") return "カテゴリ";
  if (type === "purpose") return "目的";
  if (type === "profileType") return "診断タイプ";
  if (type === "prefecture") return "地域";
  return "スコア帯";
}

export default function AdminPage() {
  const [drafts, setDrafts] = useState<SavedDraftResult[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});
  const [approvedPatterns, setApprovedPatterns] = useState<ApprovedPatternMap>(
    {}
  );
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const rawDrafts = localStorage.getItem("yorushokuDraftResults");
    const rawOutcomes = localStorage.getItem("yorushokuDraftOutcomes");
    const rawApproved = localStorage.getItem("yorushokuApprovedPatterns");

    if (rawDrafts) setDrafts(JSON.parse(rawDrafts));
    if (rawOutcomes) setOutcomes(JSON.parse(rawOutcomes));
    if (rawApproved) setApprovedPatterns(JSON.parse(rawApproved));
  }, []);

  const analysis = useMemo(() => {
    const merged = drafts
      .map((draft) => ({
        ...draft,
        outcome: outcomes[draft.id],
      }))
      .filter((item) => item.outcome);

    const usedItems = merged.filter((item) => item.outcome?.used === "使った");

    const successItems = usedItems.filter(
      (item) =>
        item.outcome?.reservation === "あり" ||
        item.outcome?.nomination === "あり" ||
        item.outcome?.visit === "あり"
    );

    const totalUsed = usedItems.length;
    const totalSuccess = successItems.length;

    const categoryMap = buildCountMap(successItems.map((item) => item.category));
    const industryMap = buildCountMap(
      successItems.map((item) => item.industry || "未設定")
    );
    const purposeMap = buildCountMap(
      successItems.map((item) => item.purpose || "未設定")
    );
    const typeMap = buildCountMap(
      successItems.map((item) => item.profileTypeName || "未設定")
    );
    const prefectureMap = buildCountMap(
      successItems.map((item) => item.prefecture || "未設定")
    );
    const scoreBandMap = buildCountMap(
      successItems.map((item) => getScoreBand(item.bodyScore))
    );

    const allPatterns: PatternItem[] = [
      ...mapToPatternItems(industryMap, totalSuccess, "industry"),
      ...mapToPatternItems(categoryMap, totalSuccess, "category"),
      ...mapToPatternItems(purposeMap, totalSuccess, "purpose"),
      ...mapToPatternItems(typeMap, totalSuccess, "profileType"),
      ...mapToPatternItems(prefectureMap, totalSuccess, "prefecture"),
      ...mapToPatternItems(scoreBandMap, totalSuccess, "scoreBand"),
    ].sort((a, b) => b.count - a.count);

    const topSuccessfulDrafts = [...successItems]
      .sort((a, b) => {
        const aScore =
          (a.outcome?.reservation === "あり" ? 1 : 0) +
          (a.outcome?.nomination === "あり" ? 1 : 0) +
          (a.outcome?.visit === "あり" ? 1 : 0);
        const bScore =
          (b.outcome?.reservation === "あり" ? 1 : 0) +
          (b.outcome?.nomination === "あり" ? 1 : 0) +
          (b.outcome?.visit === "あり" ? 1 : 0);
        return bScore - aScore || b.bodyScore - a.bodyScore;
      })
      .slice(0, 8);

    return {
      totalDrafts: drafts.length,
      totalUsed,
      totalSuccess,
      successRate: totalUsed > 0 ? Math.round((totalSuccess / totalUsed) * 100) : 0,
      allPatterns,
      topSuccessfulDrafts,
    };
  }, [drafts, outcomes]);

  const approvedCount = useMemo(
    () => Object.values(approvedPatterns).filter(Boolean).length,
    [approvedPatterns]
  );

  function toggleApproval(key: string) {
    const next = {
      ...approvedPatterns,
      [key]: !approvedPatterns[key],
    };
    setApprovedPatterns(next);
    localStorage.setItem("yorushokuApprovedPatterns", JSON.stringify(next));
    setSavedMessage("承認設定を保存しました");
    setTimeout(() => setSavedMessage(""), 1500);
  }

  const recentDrafts = useMemo(() => {
    return [...drafts].slice(0, 6);
  }, [drafts]);

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
          <p className="text-sm font-medium text-[#a3476b]">管理画面</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                運用ダッシュボード
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66616d] sm:text-base">
                会員管理・利用権限・成功パターン承認・成果確認をまとめて管理する画面です。
              </p>
              {savedMessage && (
                <p className="mt-3 text-sm font-medium text-[#7a2e4d]">
                  {savedMessage}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <a
                href="/admin/members"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                会員一覧
              </a>
              <a
                href="#pattern-approval"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                承認管理
              </a>
              <a
                href="#result-analysis"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                成果分析
              </a>
              <a
                href="#system-status"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
              >
                システム状態
              </a>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">保存済み添削数</p>
            <p className="mt-3 text-3xl font-bold">{analysis.totalDrafts}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">使用済み件数</p>
            <p className="mt-3 text-3xl font-bold">{analysis.totalUsed}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">成功件数</p>
            <p className="mt-3 text-3xl font-bold">{analysis.totalSuccess}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">成功率</p>
            <p className="mt-3 text-3xl font-bold">{analysis.successRate}%</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">承認済みパターン</p>
            <p className="mt-3 text-3xl font-bold">{approvedCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">未承認パターン</p>
            <p className="mt-3 text-3xl font-bold">
              {Math.max(analysis.allPatterns.length - approvedCount, 0)}
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <div
              id="member-management"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#a3476b]">会員管理</p>
                  <h2 className="mt-2 text-2xl font-bold">管理メニュー</h2>
                </div>

                <a
                  href="/admin/members"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
                >
                  会員一覧ページへ
                </a>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <a
                  href="/admin/members"
                  className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-5 transition hover:bg-white"
                >
                  <p className="text-sm font-semibold text-[#2c2933]">会員一覧</p>
                  <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                    会員の追加、ログインID・パスワード確認、利用 / 利用停止の切替を行います。
                  </p>
                  <span className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933]">
                    開く
                  </span>
                </a>

                <div className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-5">
                  <p className="text-sm font-semibold text-[#2c2933]">利用権限管理</p>
                  <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                    契約中かどうか、使用可能かどうか、手動承認のON/OFFをここにまとめます。
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933]"
                  >
                    後で実装
                  </button>
                </div>

                <div className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-5">
                  <p className="text-sm font-semibold text-[#2c2933]">端末制限</p>
                  <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                    1契約1端末管理、端末解除、再承認の導線をここに集約します。
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933]"
                  >
                    後で実装
                  </button>
                </div>

                <div className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-5">
                  <p className="text-sm font-semibold text-[#2c2933]">管理者ログ</p>
                  <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                    誰がどのパターンを承認したか、権限変更したかを記録する予定です。
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933]"
                  >
                    後で実装
                  </button>
                </div>
              </div>
            </div>

            <div
              id="pattern-approval"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8"
            >
              <p className="text-sm font-medium text-[#a3476b]">成功パターン承認</p>
              <h2 className="mt-2 text-2xl font-bold">承認管理</h2>

              <div className="mt-5 space-y-4">
                {analysis.allPatterns.length > 0 ? (
                  analysis.allPatterns.slice(0, 30).map((item) => {
                    const approved = !!approvedPatterns[item.key];

                    return (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                                {getBadgeLabel(item.type)}
                              </span>
                              <span className="text-sm font-semibold text-[#2c2933]">
                                {item.label}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                              出現 {item.count} 件 / 成功全体の {item.rate}%
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleApproval(item.key)}
                            className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                              approved
                                ? "bg-[#a3476b] text-white hover:bg-[#8c3c5b]"
                                : "border border-[#d8d3dc] bg-white text-[#2c2933] hover:bg-[#faf8fb]"
                            }`}
                          >
                            {approved ? "採用中" : "採用する"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#66616d]">まだ成功データがありません。</p>
                )}
              </div>
            </div>

            <div
              id="result-analysis"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8"
            >
              <p className="text-sm font-medium text-[#a3476b]">成果確認</p>
              <h2 className="mt-2 text-2xl font-bold">成功した添削の上位</h2>

              <div className="mt-5 space-y-4">
                {analysis.topSuccessfulDrafts.length > 0 ? (
                  analysis.topSuccessfulDrafts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                          {item.category}
                        </span>
                        <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                          {item.industry || "未設定"}
                        </span>
                        <span className="text-sm font-semibold text-[#2e2a3b]">
                          {item.bodyScore}点
                        </span>
                      </div>

                      {item.title && (
                        <p className="mt-3 text-base font-bold text-[#2c2933]">
                          {item.title}
                        </p>
                      )}

                      <p className="mt-3 text-sm leading-7 text-[#5d5965]">
                        {item.improvedText}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">まだ成功データがありません。</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6 xl:col-span-4">
            <div
              id="system-status"
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]"
            >
              <p className="text-sm font-medium text-[#a3476b]">システム状態</p>
              <div className="mt-4 space-y-3 text-sm text-[#5d5965]">
                <p>・診断結果保存：稼働中</p>
                <p>・添削履歴保存：稼働中</p>
                <p>・成果入力保存：稼働中</p>
                <p>・成功パターン承認：稼働中</p>
                <p>・会員一覧UI：稼働中</p>
                <p>・DB接続：未実装</p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">運用メモ</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5d5965]">
                <p>・採用したパターンだけが添削画面に反映されます。</p>
                <p>・成功件数が少ない段階では、採用を絞ると安定します。</p>
                <p>・会員一覧ページから利用停止や会員追加が行えます。</p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#a3476b]">会員管理ショートカット</p>
                <a
                  href="/admin/members"
                  className="text-sm font-semibold text-[#7a2e4d] hover:opacity-80"
                >
                  開く
                </a>
              </div>
              <div className="mt-4 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4">
                <p className="text-sm font-semibold text-[#2c2933]">会員一覧ページ</p>
                <p className="mt-2 text-sm leading-7 text-[#5d5965]">
                  ログインID・最新パスワード・利用状態の切替を確認できます。
                </p>
                <a
                  href="/admin/members"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#a3476b] px-4 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
                >
                  会員一覧へ移動
                </a>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">最近の添削履歴</p>
              <div className="mt-4 space-y-3">
                {recentDrafts.length > 0 ? (
                  recentDrafts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                          {item.category}
                        </span>
                        <span className="text-xs text-[#7b7682]">
                          {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      {item.title && (
                        <p className="mt-3 text-sm font-semibold text-[#2c2933]">
                          {item.title}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5d5965]">
                        {item.improvedText}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">まだ履歴がありません。</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}