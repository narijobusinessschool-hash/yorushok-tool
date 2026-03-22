"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MemberStatus = "契約中" | "停止中" | "解約";
type MemberRole = "管理者" | "一般会員";
type DeviceStatus = "登録済み" | "未登録" | "再承認待ち";
type MemberPlan = "free" | "nbs" | "suspended" | "cancelled";

type Member = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: MemberRole;
  status: MemberStatus;
  plan: string;
  usageCount: number;
  usageLimit: number;
  joinedAt: string;
  lastLoginAt: string;
  deviceStatus: DeviceStatus;
  usagePermission: boolean;
  note: string;
};

const initialMembers: Member[] = [];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP");
}

function getStatusBadgeClass(status: MemberStatus) {
  if (status === "契約中") {
    return "bg-[#e8f7ee] text-[#1f7a43]";
  }
  if (status === "停止中") {
    return "bg-[#fff3e8] text-[#b85c00]";
  }
  return "bg-[#f3eff6] text-[#6b6472]";
}

function getRoleBadgeClass(role: MemberRole) {
  if (role === "管理者") {
    return "bg-[#f4e2ea] text-[#7a2e4d]";
  }
  return "bg-[#f1eff4] text-[#4d4855]";
}

function getDeviceBadgeClass(status: DeviceStatus) {
  if (status === "登録済み") {
    return "bg-[#e8f7ee] text-[#1f7a43]";
  }
  if (status === "再承認待ち") {
    return "bg-[#fff3e8] text-[#b85c00]";
  }
  return "bg-[#f3eff6] text-[#6b6472]";
}

function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateMemberId(currentCount: number) {
  const next = currentCount + 1;
  return `M-${String(next).padStart(4, "0")}`;
}

function UsageToggle({
  enabled,
  onEnable,
  onDisable,
}: {
  enabled: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-[#d8d3dc] bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={onEnable}
        className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
          enabled
            ? "bg-[#f5b942] text-white shadow-sm"
            : "text-[#6a6470] hover:bg-[#faf8fb]"
        }`}
      >
        利用
      </button>
      <button
        type="button"
        onClick={onDisable}
        className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
          !enabled
            ? "bg-[#f5b942] text-white shadow-sm"
            : "text-[#6a6470] hover:bg-[#faf8fb]"
        }`}
      >
        利用停止
      </button>
    </div>
  );
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    supabase
      .from("members")
      .select("*")
      .order("id", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMembers(
            data.map((m) => ({
              id: String(m.id),
              name: m.name ?? "",
              email: m.email ?? "",
              password: m.password ?? "",
              role: m.role ?? "一般会員",
              status: m.status ?? "契約中",
              plan: m.plan ?? "free",
              usageCount: m.usage_count ?? 0,
              usageLimit: m.usage_limit ?? 3,
              joinedAt: m.created_at ?? new Date().toISOString(),
              lastLoginAt: m.created_at ?? new Date().toISOString(),
              deviceStatus: "未登録" as const,
              usagePermission: m.usage_permission ?? true,
              note: m.note ?? "",
            }))
          );
        }
      });
  }, []);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"すべて" | MemberStatus>("すべて");
  const [planFilter, setPlanFilter] = useState<"すべて" | MemberPlan | "上限到達">("すべて");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState<MemberPlan>("free");
  const [newRole, setNewRole] = useState<MemberRole>("一般会員");
  const [newNote, setNewNote] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(generatePassword());
  const [message, setMessage] = useState("");

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesKeyword =
        searchKeyword.trim() === "" ||
        member.name.includes(searchKeyword) ||
        member.email.includes(searchKeyword) ||
        member.id.includes(searchKeyword) ||
        member.note.includes(searchKeyword);

      const matchesStatus =
        statusFilter === "すべて" || member.status === statusFilter;

      const matchesPlan =
        planFilter === "すべて"
          ? true
          : planFilter === "上限到達"
          ? member.plan === "free" && member.usageCount >= member.usageLimit
          : member.plan === planFilter;

      return matchesKeyword && matchesStatus && matchesPlan;
    });
  }, [members, searchKeyword, statusFilter, planFilter]);

  const summary = useMemo(() => {
    return {
      total: members.length,
      active: members.filter((m) => m.status === "契約中").length,
      stopped: members.filter((m) => m.status === "停止中").length,
      canceled: members.filter((m) => m.status === "解約").length,
      permissionOn: members.filter((m) => m.usagePermission).length,
    };
  }, [members]);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 1800);
  }

  async function togglePermission(memberId: string, enable: boolean) {
    if (!enable) {
      const confirmed = window.confirm("本当に停止しますか？");
      if (!confirmed) return;
    }

    const newStatus = enable ? "契約中" : "停止中";
    const member = members.find((m) => m.id === memberId);
    const finalStatus = member?.status === "解約" ? "解約" : newStatus;

    await supabase
      .from("members")
      .update({ usage_permission: enable, status: finalStatus })
      .eq("id", memberId);

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, usagePermission: enable, status: finalStatus as MemberStatus }
          : m
      )
    );

    if (enable) showMessage("利用を再開しました");
  }

  async function changeStatus(memberId: string, newStatus: MemberStatus) {
    await supabase
      .from("members")
      .update({
        status: newStatus,
        usage_permission: newStatus === "契約中" ? true : false,
      })
      .eq("id", memberId);

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, status: newStatus, usagePermission: newStatus === "契約中" }
          : m
      )
    );
  }

  async function changePlan(memberId: string, newPlan: MemberPlan) {
    const confirmed = window.confirm(
      `プランを「${newPlan}」に変更しますか？`
    );
    if (!confirmed) return;

    const newLimit = newPlan === "nbs" ? 99999 : 3;

    await supabase
      .from("members")
      .update({ plan: newPlan, usage_limit: newLimit })
      .eq("id", memberId);

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, plan: newPlan, usageLimit: newLimit }
          : m
      )
    );
    showMessage(`プランを ${newPlan} に変更しました`);
  }

  function regeneratePassword() {
    setGeneratedPassword(generatePassword());
  }

  async function addMember() {
    if (!newName.trim()) {
      showMessage("名前を入力してください");
      return;
    }

    if (!newEmail.trim()) {
      showMessage("メールアドレスを入力してください");
      return;
    }

    const emailExists = members.some(
      (m) => m.email.toLowerCase() === newEmail.trim().toLowerCase()
    );

    if (emailExists) {
      showMessage("そのメールアドレスはすでに登録されています");
      return;
    }

    const { data, error } = await supabase
      .from("members")
      .insert({
        name: newName.trim(),
        email: newEmail.trim(),
        password: generatedPassword,
        role: newRole,
        status: "契約中",
        plan: newPlan,
        usage_count: 0,
        usage_limit: newPlan === "nbs" ? 99999 : 10,
        usage_permission: true,
        note: newNote.trim(),
      })
      .select()
      .single();

    if (error || !data) {
      showMessage("登録に失敗しました。もう一度お試しください。");
      return;
    }

    const now = new Date().toISOString();
    setMembers((prev) => [
      {
        id: String(data.id),
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        status: data.status,
        plan: data.plan,
        usageCount: data.usage_count ?? 0,
        usageLimit: data.usage_limit ?? 3,
        joinedAt: data.created_at ?? now,
        lastLoginAt: data.created_at ?? now,
        deviceStatus: "未登録",
        usagePermission: data.usage_permission,
        note: data.note ?? "",
      },
      ...prev,
    ]);

    setNewName("");
    setNewEmail("");
    setNewPlan("free");
    setNewRole("一般会員");
    setNewNote("");
    setGeneratedPassword(generatePassword());

    showMessage("会員を追加しました");
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
          <p className="text-sm font-medium text-[#a3476b]">管理画面 / 会員一覧</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                会員一覧ページ
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66616d] sm:text-base">
                会員追加、利用状態の切替、契約状況の確認を行う管理画面です。
              </p>
              {message && (
                <p className="mt-3 text-sm font-medium text-[#7a2e4d]">{message}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/admin"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                管理画面トップへ戻る
              </a>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">総会員数</p>
            <p className="mt-3 text-3xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">契約中</p>
            <p className="mt-3 text-3xl font-bold">{summary.active}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">停止中</p>
            <p className="mt-3 text-3xl font-bold">{summary.stopped}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">解約</p>
            <p className="mt-3 text-3xl font-bold">{summary.canceled}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">利用中</p>
            <p className="mt-3 text-3xl font-bold">{summary.permissionOn}</p>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
          <p className="text-sm font-medium text-[#a3476b]">会員追加</p>
          <h2 className="mt-2 text-2xl font-bold">新規会員を作成</h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                名前
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：山田 花子"
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                ログインID（メールアドレス）
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="example@mail.com"
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                パスワード（自動生成 または 直接入力）
              </label>
              <div className="flex gap-2">
                <input
                  value={generatedPassword}
                  onChange={(e) => setGeneratedPassword(e.target.value)}
                  placeholder="パスワードを入力 または 再生成"
                  className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm text-[#2c2933] outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                />
                <button
                  type="button"
                  onClick={regeneratePassword}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
                >
                  自動生成
                </button>
              </div>
              <p className="mt-1 text-xs text-[#8a8492]">そのまま登録するか、直接書き換えることもできます</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                権限
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as MemberRole)}
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              >
                <option>一般会員</option>
                <option>管理者</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                プラン
              </label>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value as MemberPlan)}
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              >
                <option value="free">free（無料・月10回）</option>
                <option value="nbs">nbs（NBS会員・無制限）</option>
                <option value="suspended">suspended（停止）</option>
                <option value="cancelled">cancelled（解約）</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                メモ
              </label>
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="例：デリヘル / 福岡県"
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={addMember}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
            >
              会員を追加
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                会員検索
              </label>
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="名前・メールアドレス・会員ID・メモで検索"
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                ステータス絞り込み
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "すべて" | MemberStatus)
                }
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              >
                <option>すべて</option>
                <option>契約中</option>
                <option>停止中</option>
                <option>解約</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                プラン絞り込み
              </label>
              <select
                value={planFilter}
                onChange={(e) =>
                  setPlanFilter(e.target.value as "すべて" | MemberPlan | "上限到達")
                }
                className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              >
                <option value="すべて">すべて</option>
                <option value="上限到達">上限到達（入会待ち）</option>
                <option value="free">free（無料）</option>
                <option value="nbs">nbs（NBS会員）</option>
                <option value="suspended">suspended（停止）</option>
                <option value="cancelled">cancelled（解約）</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]"
              >
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  <div className="xl:col-span-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                          member.role
                        )}`}
                      >
                        {member.role}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          member.status
                        )}`}
                      >
                        {member.status}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getDeviceBadgeClass(
                          member.deviceStatus
                        )}`}
                      >
                        {member.deviceStatus}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-[#2c2933]">
                      {member.name}
                    </h3>
                    <p className="mt-2 text-sm text-[#5d5965]">{member.email}</p>
                    <p className="mt-1 text-xs text-[#7b7682]">ID: {member.id}</p>

                    <div className="mt-4 space-y-2 text-sm text-[#5d5965]">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          member.plan === "nbs"
                            ? "bg-[#e8f7ee] text-[#1f7a43]"
                            : member.plan === "free" && member.usageCount >= member.usageLimit
                            ? "bg-[#fdf0f4] text-[#b03060]"
                            : "bg-[#f1eff4] text-[#4d4855]"
                        }`}>
                          {member.plan === "free" && member.usageCount >= member.usageLimit
                            ? "上限到達"
                            : member.plan}
                        </span>
                        {member.plan === "free" && (
                          <span className="text-xs text-[#7b7682]">
                            {member.usageCount}/{member.usageLimit}回使用
                          </span>
                        )}
                      </div>
                      <p>参加日：{formatDateTime(member.joinedAt)}</p>
                      <p>最終ログイン：{formatDateTime(member.lastLoginAt)}</p>
                      <p>メモ：{member.note || "なし"}</p>
                    </div>
                  </div>

                  <div className="xl:col-span-3">
                    <p className="text-sm font-medium text-[#2c2933]">ログイン情報</p>
                    <div className="mt-4 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4">
                      <p className="text-xs text-[#7b7682]">ログインID</p>
                      <p className="mt-1 text-sm font-medium text-[#2c2933]">
                        {member.email}
                      </p>

                      <p className="mt-4 text-xs text-[#7b7682]">初期パスワード</p>
                      <p className="mt-1 text-sm font-medium text-[#2c2933]">
                        {member.password}
                      </p>
                      <p className="mt-3 text-xs leading-6 text-[#7b7682]">
                        後で会員側が変更する前提です。
                      </p>
                    </div>
                  </div>

                  <div className="xl:col-span-2">
                    <p className="text-sm font-medium text-[#2c2933]">プラン変更</p>
                    <div className="mt-4">
                      <select
                        value={member.plan}
                        onChange={(e) =>
                          changePlan(member.id, e.target.value as MemberPlan)
                        }
                        className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option value="free">free（無料）</option>
                        <option value="nbs">nbs（NBS会員）</option>
                        <option value="suspended">suspended（停止）</option>
                        <option value="cancelled">cancelled（解約）</option>
                      </select>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-[#7b7682]">ステータス変更</p>
                      <select
                        value={member.status}
                        onChange={(e) =>
                          changeStatus(member.id, e.target.value as MemberStatus)
                        }
                        className="mt-1 h-10 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm"
                      >
                        <option>契約中</option>
                        <option>停止中</option>
                        <option>解約</option>
                      </select>
                    </div>
                  </div>

                  <div className="xl:col-span-3">
                    <p className="text-sm font-medium text-[#2c2933]">利用状態</p>
                    <div className="mt-4">
                      <UsageToggle
                        enabled={member.usagePermission}
                        onEnable={() => togglePermission(member.id, true)}
                        onDisable={() => togglePermission(member.id, false)}
                      />
                    </div>

                    <p className="mt-3 text-xs leading-6 text-[#7b7682]">
                      利用停止を押した時だけ、1回だけ確認を出します。
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[28px] bg-white px-6 py-12 text-center shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm text-[#66616d]">該当する会員がいません。</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}