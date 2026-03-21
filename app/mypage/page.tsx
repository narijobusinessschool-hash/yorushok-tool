"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SavedProfile = {
  basic: {
    character: string;
    industry: string;
    prefecture: string;
    mainGoal: string;
    priceRange: string;
    shopUrl: string;
  };
  persona: {
    ageRange: string;
    jobType: string;
    lifestyle: string[];
    visitReasons: string[];
    emotionNeeds: string[];
    worries: string[];
    triggers: string[];
    tone: string[];
    sources: string[];
    decisionPoints: string[];
  };
  usp: {
    impressions: string[];
    strengthStyles: string[];
    repeatReasons: string[];
    summary: string[];
  };
  stp: {
    segment: string;
    target: string;
    positioning: string;
  };
  diagnosis: {
    typeName: string;
    bestTarget: string;
    strengths: string;
    personaText: string;
  };
  updatedAt: string;
};

export default function MyPage() {
  const [profile, setProfile] = useState<SavedProfile | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const raw = localStorage.getItem("yorushokuCurrentUser");
      if (!raw) return;
      const currentUser = JSON.parse(raw);

      const { data } = await supabase
        .from("member_profiles")
        .select("profile_data")
        .eq("member_id", currentUser.id)
        .single();

      if (data?.profile_data) {
        setProfile(data.profile_data as SavedProfile);
        localStorage.setItem("yorushokuPersonaProfile", JSON.stringify(data.profile_data));
        return;
      }

      // Supabaseにない場合はlocalStorageから移行
      const saved = localStorage.getItem("yorushokuPersonaProfile");
      if (saved) {
        const parsed = JSON.parse(saved) as SavedProfile;
        setProfile(parsed);
        await supabase.from("member_profiles").upsert({
          member_id: currentUser.id,
          profile_data: parsed,
          updated_at: new Date().toISOString(),
        });
      }
    }
    loadProfile();
  }, []);

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError("");
    setPwMessage("");

    if (newPassword.length < 6) {
      setPwError("新しいパスワードは6文字以上で入力してください。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("新しいパスワードと確認用が一致しません。");
      return;
    }

    setPwLoading(true);
    try {
      const raw = localStorage.getItem("yorushokuCurrentUser");
      if (!raw) {
        setPwError("ログイン情報が見つかりません。");
        return;
      }
      const currentUser = JSON.parse(raw);

      // 現在のパスワードを確認
      const { data: member, error: fetchError } = await supabase
        .from("members")
        .select("id, password")
        .eq("id", currentUser.id)
        .single();

      if (fetchError || !member) {
        setPwError("アカウント情報の取得に失敗しました。");
        return;
      }

      if (member.password !== currentPassword) {
        setPwError("現在のパスワードが正しくありません。");
        return;
      }

      // 新しいパスワードに更新
      const { error: updateError } = await supabase
        .from("members")
        .update({ password: newPassword })
        .eq("id", currentUser.id);

      if (updateError) {
        setPwError("パスワードの更新に失敗しました。もう一度お試しください。");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwMessage("パスワードを変更しました。");
    } catch {
      setPwError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setPwLoading(false);
    }
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f6f4f7] px-4 py-10 text-[#1f1f23] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-[#ebe7ef]">
          <p className="text-sm font-medium text-[#a3476b]">マイページ</p>
          <h1 className="mt-2 text-3xl font-bold">診断結果がまだありません</h1>
          <p className="mt-4 text-sm leading-7 text-[#66616d]">
            まずは初回設定を完了すると、ここに診断結果が表示されます。
          </p>
          <a
            href="/onboarding"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
          >
            診断をはじめる
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#a3476b]">マイページ</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            診断結果
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#66616d]">
            いつでも見返せるように保存された診断結果です。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <p className="text-sm font-medium text-[#a3476b]">あなたは</p>
              <h2 className="mt-3 text-3xl font-bold text-[#7a2e4d]">
                {profile.diagnosis.typeName}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">こういった人を狙うといい</p>
                <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                  {profile.diagnosis.bestTarget}
                </p>
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">あなたの強み</p>
                <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                  {profile.diagnosis.strengths}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">想定ペルソナ</p>
              <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                {profile.diagnosis.personaText}
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">STP要約</p>
              <div className="mt-4 space-y-2 text-sm text-[#5d5965]">
                <p>・S：{profile.stp.segment || "未設定"}</p>
                <p>・T：{profile.stp.target || "未設定"}</p>
                <p>・P：{profile.stp.positioning || "未設定"}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">基本情報</p>
              <div className="mt-4 space-y-2 text-sm text-[#5d5965]">
                <p>・キャラ設定：{profile.basic.character || "未設定"}</p>
                <p>・業種：{profile.basic.industry || "未設定"}</p>
                <p>・都道府県：{profile.basic.prefecture || "未設定"}</p>
                <p>・主目的：{profile.basic.mainGoal || "未設定"}</p>
                <p>・価格帯：{profile.basic.priceRange || "未設定"}</p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">USP候補</p>
              <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                {profile.usp.summary.join(" / ")}
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">更新日時</p>
              <p className="mt-4 text-sm text-[#5d5965]">
                {new Date(profile.updatedAt).toLocaleString("ja-JP")}
              </p>
            </div>

            <a
              href="/onboarding"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-6 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
            >
              診断をやり直す
            </a>

            {/* パスワード変更 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">パスワード変更</p>
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#2c2933]">
                    現在のパスワード
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-11 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#2c2933]">
                    新しいパスワード
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="6文字以上"
                    className="h-11 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#2c2933]">
                    新しいパスワード（確認）
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="もう一度入力"
                    className="h-11 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                  />
                </div>

                {pwError && (
                  <p className="rounded-xl bg-[#fdf0f4] px-4 py-2 text-xs text-[#b03060]">
                    {pwError}
                  </p>
                )}
                {pwMessage && (
                  <p className="rounded-xl bg-[#edf7f0] px-4 py-2 text-xs text-[#1f7a43]">
                    {pwMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pwLoading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#a3476b] text-sm font-semibold text-white transition hover:bg-[#8c3c5b] disabled:cursor-not-allowed disabled:bg-[#d2afbe]"
                >
                  {pwLoading ? "変更中…" : "パスワードを変更する"}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}