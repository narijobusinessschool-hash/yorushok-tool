"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Member = {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  usage_count: number;
  usage_limit: number;
  usage_permission: boolean;
  created_at: string;
};

const STATUS_CLASS: Record<string, string> = {
  "契約中": "bg-[#e8f7ee] text-[#1f7a43]",
  "停止中": "bg-[#fff3e8] text-[#b85c00]",
  "解約": "bg-[#f3eff6] text-[#6b6472]",
};

export default function PermissionsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function fetchMembers() {
    const res = await fetch("/api/admin/permissions");
    const json = await res.json();
    setMembers(json.members ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleChange(member: Member, field: "usage_permission" | "status", value: boolean | string) {
    setSaving(member.id + field);
    await fetch("/api/admin/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, memberName: member.name, field, value }),
    });
    setMembers((prev) => prev.map((m) => {
      if (m.id !== member.id) return m;
      if (field === "usage_permission") return { ...m, usage_permission: value as boolean };
      if (field === "status") {
        return {
          ...m,
          status: value as string,
          usage_permission: value === "契約中" ? true : value === "停止中" ? false : m.usage_permission,
        };
      }
      return m;
    }));
    setSaving(null);
    setNotice("保存しました");
    setTimeout(() => setNotice(""), 2000);
  }

  const filtered = members.filter(
    (m) => m.name?.includes(search) || m.email?.includes(search)
  );

  const stats = {
    active: members.filter((m) => m.status === "契約中").length,
    stopped: members.filter((m) => m.status === "停止中").length,
    canceled: members.filter((m) => m.status === "解約").length,
    permitted: members.filter((m) => m.usage_permission).length,
  };

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin" className="text-sm text-[#8b84a8] hover:text-[#f2eefb] transition">← 管理画面</Link>
          {notice && <span className="text-sm font-medium text-[#4ade80]">{notice}</span>}
        </div>

        <h1 className="text-2xl font-bold">利用権限管理</h1>
        <p className="mt-1 text-sm text-[#8b84a8]">契約状態・利用許可のON/OFFを一括で管理します。</p>

        {/* サマリー */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "契約中", value: stats.active, color: "text-[#4ade80]" },
            { label: "停止中", value: stats.stopped, color: "text-[#fb923c]" },
            { label: "解約", value: stats.canceled, color: "text-[#8b84a8]" },
            { label: "利用許可中", value: stats.permitted, color: "text-[#e85d8a]" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
              <p className="text-xs text-[#8b84a8]">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}<span className="ml-0.5 text-sm font-normal text-[#4d4866]">人</span></p>
            </div>
          ))}
        </div>

        {/* 検索 */}
        <div className="mt-6">
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
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#f2eefb]">{m.name}</p>
                  <p className="mt-0.5 text-xs text-[#8b84a8]">{m.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[m.status] ?? "bg-[#f3eff6] text-[#6b6472]"}`}>
                      {m.status ?? "未設定"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.plan === "nbs" ? "bg-[#f4e2ea] text-[#7a2e4d]" : "bg-[#f0ecf4] text-[#9b92a4]"}`}>
                      {m.plan === "nbs" ? "NBS" : "無料"}
                    </span>
                    <span className="text-xs text-[#4d4866]">{m.usage_count ?? 0}/{m.usage_limit ?? 3}回</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* 利用許可トグル */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8b84a8]">利用許可</span>
                    <button
                      onClick={() => handleChange(m, "usage_permission", !m.usage_permission)}
                      disabled={saving === m.id + "usage_permission"}
                      className={`relative h-6 w-11 rounded-full transition-colors ${m.usage_permission ? "bg-[#e85d8a]" : "bg-[#2f2a45]"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${m.usage_permission ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* ステータス変更 */}
                  <select
                    value={m.status ?? "契約中"}
                    onChange={(e) => handleChange(m, "status", e.target.value)}
                    disabled={saving === m.id + "status"}
                    className="h-9 rounded-xl border border-[#2f2a45] bg-[#0e0c18] px-3 text-xs text-[#f2eefb] outline-none focus:border-[#e85d8a]"
                  >
                    <option>契約中</option>
                    <option>停止中</option>
                    <option>解約</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
