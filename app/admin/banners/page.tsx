"use client";

import { useEffect, useState, useRef } from "react";

type Banner = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 新規追加フォーム
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
  const fileRef = useRef<HTMLInputElement>(null);

  // 編集中のバナー
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");

  // ドラッグ並び替え
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  async function fetchBanners() {
    const res = await fetch("/api/admin/banners");
    const json = await res.json();
    setBanners(json.banners ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchBanners();
  }, []);

  // 画像ファイルをBase64 DataURLに変換（Supabase Storageを使わない簡易方式）
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB制限
    if (file.size > 5 * 1024 * 1024) {
      flash("ファイルサイズは5MB以下にしてください");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleAdd() {
    if (!newImageUrl.trim()) {
      flash("画像URLを入力してください");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        image_url: newImageUrl,
        link_url: newLinkUrl,
      }),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      flash(json.error || "エラーが発生しました");
      return;
    }

    setNewTitle("");
    setNewImageUrl("");
    setNewLinkUrl("");
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
    flash("バナーを追加しました");
    fetchBanners();
  }

  async function handleToggle(id: string, current: boolean) {
    await fetch("/api/admin/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    fetchBanners();
  }

  async function handleDelete(id: string) {
    if (!confirm("このバナーを削除しますか？")) return;
    await fetch("/api/admin/banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    flash("削除しました");
    fetchBanners();
  }

  function startEdit(b: Banner) {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditImageUrl(b.image_url);
    setEditLinkUrl(b.link_url);
  }

  async function handleEditSave() {
    if (!editingId) return;
    setSaving(true);
    await fetch("/api/admin/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        title: editTitle,
        image_url: editImageUrl,
        link_url: editLinkUrl,
      }),
    });
    setSaving(false);
    setEditingId(null);
    flash("更新しました");
    fetchBanners();
  }

  // ドラッグ＆ドロップ並び替え
  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  async function handleDrop(idx: number) {
    const from = dragIdx.current;
    if (from === null || from === idx) {
      dragIdx.current = null;
      setDragOverIdx(null);
      return;
    }
    const reordered = [...banners];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(idx, 0, moved);
    setBanners(reordered);
    dragIdx.current = null;
    setDragOverIdx(null);

    await fetch("/api/admin/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: true, ids: reordered.map((b) => b.id) }),
    });
    flash("並び順を更新しました");
  }

  return (
    <main className="min-h-screen bg-[#faf8fb] text-[#2c2933]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <a href="/admin" className="text-sm text-[#6b6472] hover:underline">← 管理画面に戻る</a>
            <h1 className="mt-2 text-2xl font-bold">バナー管理</h1>
            <p className="mt-1 text-sm text-[#6b6472]">最大10件まで登録可能 ・ ドラッグで並び替え</p>
          </div>
          <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-sm font-semibold text-[#4d4855]">
            {banners.length}/10
          </span>
        </div>

        {/* メッセージ */}
        {message && (
          <div className="mb-4 rounded-xl bg-[#e8f7ee] px-4 py-3 text-sm font-medium text-[#1f7a43]">
            {message}
          </div>
        )}

        {/* 追加ボタン */}
        {!showForm && banners.length < 10 && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d8d3dc] bg-white py-4 text-sm font-semibold text-[#6b6472] transition hover:border-[#e85d8a] hover:text-[#e85d8a]"
          >
            ＋ 新しいバナーを追加
          </button>
        )}

        {/* 追加フォーム */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-[#d8d3dc] bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">新しいバナーを追加</h2>

            {/* タイトル */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[#4d4855]">管理用タイトル</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例: 春キャンペーン広告"
                className="w-full rounded-xl border border-[#d8d3dc] bg-[#faf8fb] px-4 py-2.5 text-sm focus:border-[#e85d8a] focus:outline-none"
              />
            </div>

            {/* 画像入力モード切替 */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[#4d4855]">画像</label>
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => setUploadMode("url")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    uploadMode === "url"
                      ? "bg-[#e85d8a] text-white"
                      : "bg-[#f1eff4] text-[#6b6472] hover:bg-[#e8e5ec]"
                  }`}
                >
                  URLで指定
                </button>
                <button
                  onClick={() => setUploadMode("upload")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    uploadMode === "upload"
                      ? "bg-[#e85d8a] text-white"
                      : "bg-[#f1eff4] text-[#6b6472] hover:bg-[#e8e5ec]"
                  }`}
                >
                  画像をアップロード
                </button>
              </div>

              {uploadMode === "url" ? (
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full rounded-xl border border-[#d8d3dc] bg-[#faf8fb] px-4 py-2.5 text-sm focus:border-[#e85d8a] focus:outline-none"
                />
              ) : (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full rounded-xl border border-[#d8d3dc] bg-[#faf8fb] px-4 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#e85d8a] file:px-3 file:py-1 file:text-sm file:font-medium file:text-white"
                  />
                  <p className="mt-1 text-xs text-[#8b84a8]">推奨サイズ: 1200×240px（5:1）、最大5MB</p>
                </div>
              )}

              {/* プレビュー */}
              {newImageUrl && (
                <div className="mt-3 overflow-hidden rounded-xl border border-[#d8d3dc]">
                  <img
                    src={newImageUrl}
                    alt="プレビュー"
                    className="w-full object-cover"
                    style={{ aspectRatio: "5 / 1" }}
                  />
                </div>
              )}
            </div>

            {/* リンクURL */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[#4d4855]">リンクURL（クリック先）</label>
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://example.com/lp"
                className="w-full rounded-xl border border-[#d8d3dc] bg-[#faf8fb] px-4 py-2.5 text-sm focus:border-[#e85d8a] focus:outline-none"
              />
            </div>

            {/* ボタン */}
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-xl bg-[#e85d8a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d4507c] disabled:opacity-50"
              >
                {saving ? "保存中…" : "追加する"}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewImageUrl(""); setNewTitle(""); setNewLinkUrl(""); }}
                className="rounded-xl border border-[#d8d3dc] px-6 py-2.5 text-sm font-medium text-[#6b6472] transition hover:bg-[#f1eff4]"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* バナー一覧 */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#f1eff4]" />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="rounded-2xl border border-[#d8d3dc] bg-white p-8 text-center text-sm text-[#6b6472]">
            まだバナーが登録されていません
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((b, idx) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => setDragOverIdx(null)}
                className={`rounded-2xl border bg-white transition ${
                  dragOverIdx === idx
                    ? "border-[#e85d8a] shadow-lg"
                    : "border-[#d8d3dc]"
                } ${!b.is_active ? "opacity-50" : ""}`}
              >
                {editingId === b.id ? (
                  /* 編集モード */
                  <div className="p-4">
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-medium text-[#6b6472]">管理用タイトル</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-[#d8d3dc] bg-[#faf8fb] px-3 py-2 text-sm focus:border-[#e85d8a] focus:outline-none"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-medium text-[#6b6472]">画像URL</label>
                      <input
                        type="url"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        className="w-full rounded-lg border border-[#d8d3dc] bg-[#faf8fb] px-3 py-2 text-sm focus:border-[#e85d8a] focus:outline-none"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-medium text-[#6b6472]">リンクURL</label>
                      <input
                        type="url"
                        value={editLinkUrl}
                        onChange={(e) => setEditLinkUrl(e.target.value)}
                        className="w-full rounded-lg border border-[#d8d3dc] bg-[#faf8fb] px-3 py-2 text-sm focus:border-[#e85d8a] focus:outline-none"
                      />
                    </div>
                    {editImageUrl && (
                      <div className="mb-3 overflow-hidden rounded-lg border border-[#d8d3dc]">
                        <img src={editImageUrl} alt="プレビュー" className="w-full object-cover" style={{ aspectRatio: "5 / 1" }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditSave}
                        disabled={saving}
                        className="rounded-lg bg-[#e85d8a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d4507c] disabled:opacity-50"
                      >
                        {saving ? "保存中…" : "保存"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-[#d8d3dc] px-4 py-2 text-xs font-medium text-[#6b6472]"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 表示モード */
                  <div className="flex items-center gap-4 p-4">
                    {/* ドラッグハンドル */}
                    <div className="cursor-grab text-lg text-[#b5b0be] hover:text-[#6b6472]" title="ドラッグで並び替え">
                      ⠿
                    </div>

                    {/* サムネイル */}
                    <div className="w-32 flex-shrink-0 overflow-hidden rounded-lg border border-[#e8e5ec]">
                      <img
                        src={b.image_url}
                        alt={b.title || "バナー"}
                        className="w-full object-cover"
                        style={{ aspectRatio: "5 / 1" }}
                      />
                    </div>

                    {/* 情報 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{b.title || "（タイトルなし）"}</p>
                      <p className="mt-0.5 truncate text-xs text-[#8b84a8]">{b.link_url || "リンクなし"}</p>
                    </div>

                    {/* アクション */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(b.id, b.is_active)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          b.is_active
                            ? "bg-[#e8f7ee] text-[#1f7a43]"
                            : "bg-[#f3eff6] text-[#6b6472]"
                        }`}
                      >
                        {b.is_active ? "表示中" : "非表示"}
                      </button>
                      <button
                        onClick={() => startEdit(b)}
                        className="rounded-lg border border-[#d8d3dc] px-3 py-1.5 text-xs font-medium text-[#4d4855] transition hover:bg-[#f1eff4]"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="rounded-lg border border-[#d8d3dc] px-3 py-1.5 text-xs font-medium text-[#c94c4c] transition hover:bg-[#fef2f2]"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 使い方メモ */}
        <div className="mt-8 rounded-2xl border border-[#d8d3dc] bg-white p-6">
          <h3 className="mb-2 text-sm font-bold text-[#4d4855]">バナー設定について</h3>
          <ul className="space-y-1 text-xs leading-5 text-[#6b6472]">
            <li>・推奨画像サイズ: <strong>1200×240px</strong>（横長 5:1比率）</li>
            <li>・「表示中」のバナーのみダッシュボードに表示されます</li>
            <li>・バナーは自動でスライド表示されます（5秒間隔）</li>
            <li>・ドラッグ＆ドロップで表示順を変更できます</li>
            <li>・画像URLまたはファイルアップロードで追加できます</li>
            <li>・最大10件まで登録可能です</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
