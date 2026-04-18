"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Member = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  device_status: string | null;
  device_fingerprint: string | null;
  last_login_at: string | null;
  created_at: string;
};

const DEVICE_CLASS: Record<string, string> = {
  "登録済み": "bg-[#e8f7ee] text-[#1f7a43]",
  "再承認待ち": "bg-[#fff3e8] text-[#b85c00]",
  "未登録": "bg-[#f3eff6] text-[#6b6472]",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DevicePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function fetchMembers() {
    const res = await fetch("/api/admin/device");
    const json = await res.json();
    setMembers(json.members ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleAction(member: Member, action: "reset" | "set_reapproval") {
    setActing(member.id + action);
    await fetch("/api/admin/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, memberName: member.name, action }),
    });
    const newStatus = action === "reset" ? "未登録" : "再承認待ち";
    setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, device_status: newStatus } : m));
    setActing(null);
    setNotice("更新しました");
    setTimeout(() => setNotice(""), 2000);
  }

  const filtered = members.filter(
    (m) => m.name?.includes(search) || m.email?.includes(search)
  );

  const stats = {
    registered: members.filter((m) => m.device_status === "登録済み").length,
    reapproval: members.filter((m) => m.device_status === "再承認待ち").length,
    unregistered: members.filter((m) => !m.device_status || m.device_status === "未登録").length,
  };

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin" className="text-sm text-[#8b84a8] hover:text-[#f2eefb] transition">← 管理画面</Link>
          {notice && <span className="text-sm font-medium text-[#4ade80]">{notice}</span>}
        </div>

        <h1 className="text-2xl font-bold">端末制限管理</h1>
        <p className="mt-1 text-sm text-[#8b84a8]">1契約1端末の管理、デバイスリセット、再承認を行います。</p>

        {/* 説明 */}
        <div className="mt-4 rounded-2xl border border-[#231f36] bg-[#110e1c] p-4 text-sm leading-7 text-[#8b84a8]">
          <p>会員が機種変更したときなど「デバイスリセット」で端末縛りを解除します。</p>
          <p>「再承認を要求」にすると、次回ログイン時に再認証が必要になります。</p>
        </div>

        {/* サマリー */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "登録済み", value: stats.registered, color: "text-[#4ade80]" },
            { label: "再承認待ち", value: stats.reapproval, color: "text-[#fb923c]" },
            { label: "未登録", value: stats.unregistered, color: "text-[#8b84a8]" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
              <p className="text-xs text-[#8b84a8]">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}<span className="ml-0.5 text-sm font-normal text-[#4d4866]">人</span></p>
            </div>
          ))}
        </div>

        {/* 検索 */}
        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・メールで検索"
            className="h-11 w-full rounded-2xl border border-[#231f36] bg-[#110e1c] px-4 text-sm text-[#f2eefb] placeholder-[#4d4866] outline-none focus:border-[#e85d8a]"
          />
        </div>

        {/* リスト */}
        <div className="mt-4 space-y-3">
          {loading && <p className="py-8 text-center text-sm text-[#4d4866]">読み込み中…</p>}
          {!loading && filtered.length === 0 && <p className="py-8 text-center text-sm text-[#4d4866]">会員が見つかりません</p>}
          {filtered.map((m) => {
            const ds = m.device_status ?? "未登録";
            return (
              <div key={m.id} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#f2eefb]">{m.name}</p>
                    <p className="mt-0.5 text-xs text-[#8b84a8]">{m.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DEVICE_CLASS[ds] ?? "bg-[#f3eff6] text-[#6b6472]"}`}>{ds}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.plan === "nbs" ? "bg-[#f4e2ea] text-[#7a2e4d]" : "bg-[#f0ecf4] text-[#9b92a4]"}`}>
                        {m.plan === "nbs" ? "NBS" : "無料"}
                      </span>
                      <span className="text-xs text-[#4d4866]">最終ログイン: {formatDate(m.last_login_at)}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#4d4866]">
                      端末指紋: {m.device_fingerprint ? (
                        <span className="font-mono text-[#8b84a8]" title={m.device_fingerprint}>
                          {m.device_fingerprint.slice(0, 12)}…
                        </span>
                      ) : (
                        <span className="text-[#4d4866]">未取得</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAction(m, "reset")}
                      disabled={!!acting}
                      className="rounded-xl border border-[#2f2a45] px-3 py-1.5 text-xs text-[#8b84a8] transition hover:border-[#e85d8a]/50 hover:text-[#f2eefb] disabled:opacity-40"
                    >
                      デバイスリセット
                    </button>
                    <button
                      onClick={() => handleAction(m, "set_reapproval")}
                      disabled={!!acting}
                      className="rounded-xl border border-[#5c3a1e] px-3 py-1.5 text-xs text-[#fb923c] transition hover:bg-[#5c3a1e]/20 disabled:opacity-40"
                    >
                      再承認を要求
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
