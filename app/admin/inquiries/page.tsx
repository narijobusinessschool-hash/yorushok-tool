"use client";

import { useEffect, useState } from "react";

type Inquiry = {
  id: string;
  created_at: string;
  member_id: string;
  name: string;
  message: string;
  is_read: boolean;
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const unreadCount = inquiries.filter((q) => !q.is_read).length;

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/inquiries");
      const json = await res.json();
      setInquiries(json.inquiries ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleMarkAllRead() {
    setMarking(true);
    await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    setInquiries((prev) => prev.map((q) => ({ ...q, is_read: true })));
    setMarking(false);
  }

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb] px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="mb-1 text-xs font-semibold tracking-widest text-[#e85d8a] uppercase">Admin</p>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">問い合わせ一覧</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={marking}
              className="rounded-lg bg-[#2a2040] px-3 py-1.5 text-xs font-medium text-[#c8c2dc] transition hover:bg-[#3a2f55] disabled:opacity-40"
            >
              {marking ? "処理中..." : `未読 ${unreadCount}件 を一括既読`}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-[#8b84a8]">読み込み中...</p>
        ) : inquiries.length === 0 ? (
          <p className="text-[#8b84a8]">問い合わせはまだありません</p>
        ) : (
          <div className="space-y-4">
            {inquiries.map((q) => (
              <div
                key={q.id}
                className={`rounded-xl border p-4 ${q.is_read ? "border-[#2a2040] bg-[#110e1c]" : "border-[#6b2a4a] bg-[#1c0e18]"}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!q.is_read && (
                      <span className="h-2 w-2 rounded-full bg-[#e85d8a] flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-[#e85d8a]">{q.name}</span>
                  </div>
                  <span className="text-xs text-[#4d4866]">
                    {new Date(q.created_at).toLocaleString("ja-JP")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#c8c2dc]">{q.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
