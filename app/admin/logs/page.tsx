"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ErrorLog = {
  id: string;
  created_at: string;
  type: string;
  message: string;
  detail: Record<string, unknown> | null;
  user_id: string | null;
};

type UsageEvent = {
  id: string;
  created_at: string;
  event_type: string;
  user_id: string | null;
  meta: Record<string, unknown> | null;
};

type EventCount = { event_type: string; count: number };

const EVENT_LABELS: Record<string, string> = {
  login_success: "ログイン成功",
  analyze_success: "AI添削実行",
  admin_log: "管理者操作",
  pattern_suggestion: "パターン提案",
  copy_body: "本文コピー",
  feedback: "フィードバック",
  page_view: "ページ閲覧",
};

const ADMIN_ACTION_LABELS: Record<string, string> = {
  permission_change: "権限変更",
  device_reset: "デバイスリセット",
  device_set_reapproval: "再承認要求",
};

const ERROR_LABELS: Record<string, string> = {
  login_failed: "ログイン失敗",
  login_blocked: "アカウント制限",
  login_exception: "ログイン例外",
  api_generate_error: "添削APIエラー",
  analyze_failed: "添削クライアントエラー",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function AdminLogsPage() {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [eventCounts, setEventCounts] = useState<EventCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stats" | "errors" | "admin">("stats");

  useEffect(() => {
    async function fetchAll() {
      const [eventsRes, errorsRes] = await Promise.all([
        supabase
          .from("usage_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("error_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const evts: UsageEvent[] = eventsRes.data ?? [];
      const errs: ErrorLog[] = errorsRes.data ?? [];

      setEvents(evts);
      setErrors(errs);

      // イベント種別ごとの件数集計
      const countMap: Record<string, number> = {};
      evts.forEach((e) => {
        countMap[e.event_type] = (countMap[e.event_type] ?? 0) + 1;
      });
      setEventCounts(
        Object.entries(countMap)
          .map(([event_type, count]) => ({ event_type, count }))
          .sort((a, b) => b.count - a.count)
      );

      setLoading(false);
    }

    fetchAll();
  }, []);

  const last7Events = events.filter((e) => daysSince(e.created_at) < 7);
  const last7Errors = errors.filter((e) => daysSince(e.created_at) < 7);
  const loginCount = last7Events.filter((e) => e.event_type === "login_success").length;
  const analyzeCount = last7Events.filter((e) => e.event_type === "analyze_success").length;

  const avgScore =
    analyzeCount > 0
      ? Math.round(
          last7Events
            .filter((e) => e.event_type === "analyze_success" && e.meta?.bodyScore)
            .reduce((sum, e) => sum + (e.meta?.bodyScore as number), 0) /
            Math.max(
              last7Events.filter(
                (e) => e.event_type === "analyze_success" && e.meta?.bodyScore
              ).length,
              1
            )
        )
      : null;

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
          <p className="text-sm font-medium text-[#a3476b]">管理画面 / 統計・ログ</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                エラーログ・利用統計
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#66616d]">
                ログイン・添削・エラーの発生状況をリアルタイムで確認できます。
              </p>
            </div>
            <a
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
            >
              管理画面トップへ
            </a>
          </div>
        </header>

        {/* サマリーカード */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-xs text-[#66616d]">ログイン（7日間）</p>
            <p className="mt-3 text-3xl font-bold">{loading ? "…" : loginCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-xs text-[#66616d]">AI添削（7日間）</p>
            <p className="mt-3 text-3xl font-bold">{loading ? "…" : analyzeCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-xs text-[#66616d]">平均スコア（7日間）</p>
            <p className="mt-3 text-3xl font-bold">
              {loading ? "…" : avgScore !== null ? `${avgScore}点` : "–"}
            </p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-xs text-[#66616d]">エラー（7日間）</p>
            <p className={`mt-3 text-3xl font-bold ${last7Errors.length > 0 ? "text-[#b03060]" : ""}`}>
              {loading ? "…" : last7Errors.length}
            </p>
          </div>
        </section>

        {/* タブ */}
        <div className="mt-6 flex gap-1 rounded-2xl bg-[#f3f0f6] p-1 w-fit">
          {(["stats", "errors", "admin"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                tab === t
                  ? "bg-white text-[#a3476b] shadow-sm"
                  : "text-[#66616d] hover:text-[#2c2933]"
              }`}
            >
              {t === "stats" ? "利用統計" : t === "errors" ? `エラーログ（${errors.length}件）` : "管理者操作ログ"}
            </button>
          ))}
        </div>

        {tab === "stats" && (
          <section className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* イベント種別集計 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] xl:col-span-5">
              <p className="text-sm font-medium text-[#a3476b]">機能別 利用回数（全期間）</p>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <p className="text-sm text-[#66616d]">読み込み中…</p>
                ) : eventCounts.length > 0 ? (
                  eventCounts.map((item) => {
                    const max = eventCounts[0].count;
                    const pct = Math.round((item.count / max) * 100);
                    return (
                      <div key={item.event_type}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#2c2933]">
                            {EVENT_LABELS[item.event_type] ?? item.event_type}
                          </span>
                          <span className="font-bold text-[#2c2933]">{item.count}回</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full rounded-full bg-[#f3f0f6]">
                          <div
                            className="h-2 rounded-full bg-[#a3476b]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#66616d]">まだデータがありません。</p>
                )}
              </div>
            </div>

            {/* 最近のイベント */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] xl:col-span-7">
              <p className="text-sm font-medium text-[#a3476b]">最近の利用ログ</p>
              <div className="mt-5 space-y-2">
                {loading ? (
                  <p className="text-sm text-[#66616d]">読み込み中…</p>
                ) : events.length > 0 ? (
                  events.slice(0, 30).map((e) => (
                    <div
                      key={e.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] px-4 py-3"
                    >
                      <div>
                        <span className="inline-block rounded-full bg-[#f4e2ea] px-2.5 py-1 text-xs font-semibold text-[#7a2e4d]">
                          {EVENT_LABELS[e.event_type] ?? e.event_type}
                        </span>
                        {e.meta && (
                          <p className="mt-1 text-xs text-[#7b7682]">
                            {e.meta.category ? `${e.meta.category} ` : ""}
                            {e.meta.bodyScore ? `スコア: ${e.meta.bodyScore}点` : ""}
                            {e.meta.role ? `役割: ${e.meta.role}` : ""}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-[#9b92a4]">
                        {formatDate(e.created_at)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">まだデータがありません。</p>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "errors" && (
          <section className="mt-4 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
            <p className="text-sm font-medium text-[#a3476b]">エラーログ一覧</p>
            <div className="mt-5 space-y-3">
              {loading ? (
                <p className="text-sm text-[#66616d]">読み込み中…</p>
              ) : errors.length > 0 ? (
                errors.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#fdf0f4] px-2.5 py-1 text-xs font-semibold text-[#b03060]">
                          {ERROR_LABELS[e.type] ?? e.type}
                        </span>
                        <span className="text-sm font-medium text-[#2c2933]">{e.message}</span>
                      </div>
                      <span className="text-xs text-[#9b92a4]">{formatDate(e.created_at)}</span>
                    </div>
                    {e.detail && (
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-[#f6f4f7] px-3 py-2 text-xs text-[#5d5965]">
                        {JSON.stringify(e.detail, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#66616d]">エラーは記録されていません。</p>
              )}
            </div>
          </section>
        )}

        {tab === "admin" && (() => {
          const adminLogs = events.filter((e) => e.event_type === "admin_log");
          return (
            <section className="mt-4 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <p className="text-sm font-medium text-[#a3476b]">管理者操作ログ（{adminLogs.length}件）</p>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <p className="text-sm text-[#66616d]">読み込み中…</p>
                ) : adminLogs.length > 0 ? (
                  adminLogs.map((e) => {
                    const action = e.meta?.action as string | undefined;
                    const label = action ? (ADMIN_ACTION_LABELS[action] ?? action) : "操作";
                    const targetName = e.meta?.targetName as string | undefined;
                    return (
                      <div
                        key={e.id}
                        className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#f3f0f6] px-2.5 py-1 text-xs font-semibold text-[#5d3e72]">
                                {label}
                              </span>
                              {targetName && (
                                <span className="text-sm font-medium text-[#2c2933]">{targetName}</span>
                              )}
                            </div>
                            {e.meta && (
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#7b7682]">
                                {e.meta.field && <span>フィールド: {e.meta.field as string}</span>}
                                {e.meta.value !== undefined && <span>値: {String(e.meta.value)}</span>}
                                {e.meta.targetMemberId && <span className="font-mono text-[#9b92a4]">ID: {(e.meta.targetMemberId as string).slice(0, 8)}…</span>}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-[#9b92a4]">{formatDate(e.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#66616d]">管理者操作はまだ記録されていません。</p>
                )}
              </div>
            </section>
          );
        })()}
      </div>
    </main>
  );
}
