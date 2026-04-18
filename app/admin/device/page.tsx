"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Member = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  device_fingerprint: string | null;
  last_login_at: string | null;
  created_at: string;
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
  const [fingerprintInput, setFingerprintInput] = useState("");
  const [bulkActing, setBulkActing] = useState(false);

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
    setMembers((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? {
              ...m,
              device_fingerprint: action === "reset" ? null : m.device_fingerprint,
            }
          : m,
      ),
    );
    setActing(null);
    setNotice("更新しました");
    setTimeout(() => setNotice(""), 2000);
  }

  async function handleResetAll() {
    if (!window.confirm("全会員の端末指紋を一括クリアします。\n\n各会員は次回ログイン時に再度指紋が取得されます（実害なし）。\n\nよろしいですか？")) return;
    if (!window.confirm("最終確認：本当に全員の端末指紋をクリアしますか？")) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/admin/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_all" }),
      });
      const json = await res.json();
      await fetchMembers();
      setNotice(`${json.affectedCount ?? 0} 名の指紋をクリアしました`);
      setTimeout(() => setNotice(""), 3000);
    } finally {
      setBulkActing(false);
    }
  }

  async function handleReleaseFingerprint() {
    const fp = fingerprintInput.trim();
    if (!fp) {
      setNotice("指紋の値を入力してください");
      setTimeout(() => setNotice(""), 2000);
      return;
    }
    if (!window.confirm(`指紋「${fp.slice(0, 20)}${fp.length > 20 ? "…" : ""}」を持つ全会員から端末紐付けを解放します。\n\nよろしいですか？`)) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/admin/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_fingerprint", fingerprint: fp }),
      });
      const json = await res.json();
      await fetchMembers();
      setFingerprintInput("");
      setNotice(`${json.affectedCount ?? 0} 名の指紋を解放しました`);
      setTimeout(() => setNotice(""), 3000);
    } finally {
      setBulkActing(false);
    }
  }

  async function releaseOneFingerprint(fingerprint: string, email: string) {
    if (!window.confirm(`${email} の端末紐付けを解除します。\n\n会員アカウントは削除されません。端末指紋だけがクリアされ、同端末から新規登録可能になります。\n\nよろしいですか？`)) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/admin/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_fingerprint", fingerprint }),
      });
      const json = await res.json();
      await fetchMembers();
      setNotice(`${email} の端末を解除しました（${json.affectedCount ?? 0}件）`);
      setTimeout(() => setNotice(""), 3000);
    } finally {
      setBulkActing(false);
    }
  }

  async function deleteMemberFromDeviceList(memberId: string, email: string) {
    if (!window.confirm(`【警告】会員「${email}」を完全削除します。\n\n・関連する添削履歴・AI学習プロフィール・診断データも全て削除されます\n・端末指紋も自動的に削除されます\n・この操作は元に戻せません\n\n本当に削除しますか？`)) return;
    if (!window.confirm(`最終確認：${email} を削除します。よろしいですか？`)) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/admin/delete-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, memberEmail: email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice(json.error ?? "削除に失敗しました");
        setTimeout(() => setNotice(""), 3000);
        return;
      }
      await fetchMembers();
      setNotice(`${email} を完全削除しました`);
      setTimeout(() => setNotice(""), 3000);
    } finally {
      setBulkActing(false);
    }
  }

  const filtered = members.filter(
    (m) => m.name?.includes(search) || m.email?.includes(search)
  );

  // 端末指紋の保有統計
  const withFingerprint = members.filter((m) => m.device_fingerprint).length;
  const fingerprintMap = new Map<string, number>();
  for (const m of members) {
    if (m.device_fingerprint) {
      fingerprintMap.set(m.device_fingerprint, (fingerprintMap.get(m.device_fingerprint) ?? 0) + 1);
    }
  }
  const duplicateFingerprints = Array.from(fingerprintMap.entries()).filter(([, count]) => count > 1);

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
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
            <p className="text-xs text-[#8b84a8]">総会員数</p>
            <p className="mt-1 text-2xl font-bold text-[#f2eefb]">
              {members.length}
              <span className="ml-0.5 text-sm font-normal text-[#4d4866]">人</span>
            </p>
          </div>
          <div className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-4">
            <p className="text-xs text-[#8b84a8]">端末指紋 保有</p>
            <p className="mt-1 text-2xl font-bold text-[#4ade80]">
              {withFingerprint}
              <span className="ml-0.5 text-sm font-normal text-[#4d4866]">人</span>
            </p>
          </div>
        </div>

        {/* 端末指紋のグローバル操作 */}
        <div className="mt-4 rounded-2xl border border-[#5c1a2e] bg-[#1e0a12] p-5">
          <h2 className="text-sm font-semibold text-[#f2eefb]">端末指紋の直接操作</h2>
          <p className="mt-1 text-xs text-[#8b84a8] leading-6">
            指紋保有: <span className="font-mono text-[#e85d8a]">{withFingerprint}</span> 件
            {duplicateFingerprints.length > 0 && (
              <>
                {"　／　"}重複あり: <span className="font-mono text-[#fb923c]">{duplicateFingerprints.length}</span> 種類
              </>
            )}
          </p>

          {/* 指紋値で直接解放 */}
          <div className="mt-4">
            <label className="text-xs text-[#c8c2dc]">特定の端末指紋を解放（指紋値を入力）</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={fingerprintInput}
                onChange={(e) => setFingerprintInput(e.target.value)}
                placeholder="例: Y3tX0u0yi2N0bJmSH36E"
                className="h-11 flex-1 rounded-xl border border-[#2f2a45] bg-[#0e0c18] px-4 font-mono text-sm text-[#f2eefb] outline-none focus:border-[#e85d8a]"
              />
              <button
                type="button"
                onClick={handleReleaseFingerprint}
                disabled={bulkActing || !fingerprintInput.trim()}
                className="h-11 rounded-xl border border-[#e85d8a] bg-transparent px-4 text-xs font-semibold text-[#e85d8a] transition hover:bg-[#e85d8a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkActing ? "処理中…" : "この指紋を解放"}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-5 text-[#4d4866]">
              指定した指紋を持つ全会員の端末紐付けがクリアされます。会員アカウント自体は削除されません。
            </p>
          </div>

          {/* 一括リセット */}
          <div className="mt-5 border-t border-[#3a1e27] pt-4">
            <button
              type="button"
              onClick={handleResetAll}
              disabled={bulkActing || withFingerprint === 0}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#d14343] px-4 text-xs font-semibold text-white transition hover:bg-[#b83333] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkActing ? "処理中…" : `全員の端末指紋を一括クリア（${withFingerprint}件）`}
            </button>
            <p className="mt-2 text-[10px] leading-5 text-[#4d4866]">
              すべての会員の端末紐付けを一度にクリアします。各会員は次回ログイン時に再度指紋が取得されます。会員アカウント自体は削除されません。
            </p>
          </div>

          {/* 登録端末一覧（メール + 指紋 + 解除ボタン） */}
          <div className="mt-5 border-t border-[#3a1e27] pt-4">
            <p className="text-xs font-semibold text-[#c8c2dc]">登録されている端末一覧</p>
            <p className="mt-1 text-[10px] text-[#8b84a8]">
              指紋を保存している会員の一覧です。「解除」ボタンで端末紐付けだけを外せます（会員アカウントは削除されません）。
            </p>
            <div className="mt-3 space-y-2">
              {members.filter((m) => m.device_fingerprint).length === 0 ? (
                <p className="py-4 text-center text-xs text-[#4d4866]">
                  登録されている端末はありません
                </p>
              ) : (
                members
                  .filter((m) => m.device_fingerprint)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-[#231f36] bg-[#0e0c18] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#f2eefb]">{m.email}</p>
                        <p
                          className="mt-1 truncate font-mono text-[10px] text-[#8b84a8]"
                          title={m.device_fingerprint ?? ""}
                        >
                          {m.device_fingerprint?.slice(0, 24)}
                          {(m.device_fingerprint?.length ?? 0) > 24 ? "…" : ""}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#4d4866]">
                          登録: {formatDate(m.created_at)}
                          {m.last_login_at ? ` ／ 最終ログイン: ${formatDate(m.last_login_at)}` : ""}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => m.device_fingerprint && releaseOneFingerprint(m.device_fingerprint, m.email)}
                          disabled={bulkActing}
                          className="rounded-lg border border-[#e85d8a] px-3 py-1 text-[10px] font-semibold text-[#e85d8a] transition hover:bg-[#e85d8a] hover:text-white disabled:opacity-50"
                        >
                          端末のみ解除
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMemberFromDeviceList(m.id, m.email)}
                          disabled={bulkActing}
                          className="rounded-lg border border-[#d14343] bg-transparent px-3 py-1 text-[10px] font-semibold text-[#d14343] transition hover:bg-[#d14343] hover:text-white disabled:opacity-50"
                        >
                          会員ごと削除
                        </button>
                        <span className="text-[10px] text-[#4d4866]">
                          ※ 会員ごと削除すれば端末情報も自動で削除されます
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* 重複指紋の表示 */}
          {duplicateFingerprints.length > 0 && (
            <div className="mt-5 border-t border-[#3a1e27] pt-4">
              <p className="text-xs font-semibold text-[#fb923c]">⚠ 重複している端末指紋</p>
              <p className="mt-1 text-[10px] text-[#8b84a8]">複数会員が同じ指紋を持っている状態です。新規登録時にブロックされる原因になります。</p>
              <div className="mt-2 space-y-2">
                {duplicateFingerprints.map(([fp, count]) => (
                  <div
                    key={fp}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#3a1e27] bg-[#0e0c18] px-3 py-2"
                  >
                    <div>
                      <p className="font-mono text-xs text-[#c8c2dc]" title={fp}>
                        {fp.slice(0, 20)}{fp.length > 20 ? "…" : ""}
                      </p>
                      <p className="text-[10px] text-[#8b84a8]">{count} 名が保有</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFingerprintInput(fp);
                        setTimeout(() => handleReleaseFingerprint(), 0);
                      }}
                      disabled={bulkActing}
                      className="shrink-0 rounded-lg border border-[#e85d8a] px-3 py-1 text-[10px] font-semibold text-[#e85d8a] transition hover:bg-[#e85d8a] hover:text-white disabled:opacity-50"
                    >
                      解放
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl border border-[#231f36] bg-[#110e1c] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#f2eefb]">{m.name || m.email}</p>
                  <p className="mt-0.5 text-xs text-[#8b84a8]">{m.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.plan === "nbs" ? "bg-[#f4e2ea] text-[#7a2e4d]" : "bg-[#f0ecf4] text-[#9b92a4]"}`}>
                      {m.plan === "nbs" ? "NBS" : "無料"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.device_fingerprint ? "bg-[#e8f7ee] text-[#1f7a43]" : "bg-[#f3eff6] text-[#6b6472]"}`}>
                      {m.device_fingerprint ? "端末登録済" : "端末未登録"}
                    </span>
                    <span className="text-xs text-[#4d4866]">最終ログイン: {formatDate(m.last_login_at)}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#4d4866]">
                    端末指紋: {m.device_fingerprint ? (
                      <span className="font-mono text-[#8b84a8]" title={m.device_fingerprint}>
                        {m.device_fingerprint.slice(0, 24)}…
                      </span>
                    ) : (
                      <span className="text-[#4d4866]">未取得</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction(m, "reset")}
                    disabled={!!acting || !m.device_fingerprint}
                    className="rounded-xl border border-[#2f2a45] px-3 py-1.5 text-xs text-[#8b84a8] transition hover:border-[#e85d8a]/50 hover:text-[#f2eefb] disabled:opacity-40"
                  >
                    デバイスリセット
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
