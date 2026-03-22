"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logError, logEvent } from "@/lib/logger";

const SAVED_LOGIN_KEY = "yorushokuSavedLogin";
const CURRENT_USER_KEY = "yorushokuCurrentUser";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_LOGIN_KEY);
    if (saved) {
      const { email: savedEmail } = JSON.parse(saved);
      setEmail(savedEmail ?? "");
      setRememberMe(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok) {
        logError("login_failed", json.error ?? "ログイン失敗", { email: email.trim() });
        setError(json.error ?? "メールアドレスまたはパスワードが違います。");
        return;
      }

      const { user: data } = json;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      logEvent("login_success", data.id, { role: data.role });

      document.cookie = `yorushoku_session=${encodeURIComponent(JSON.stringify({ role: data.role }))}; path=/; max-age=86400`;

      if (rememberMe) {
        // パスワードは保存しない（メールアドレスのみ）
        localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify({ email: email.trim() }));
      } else {
        localStorage.removeItem(SAVED_LOGIN_KEY);
      }

      if (data.role === "管理者") {
        router.push("/admin");
      } else {
        const hasProfile = localStorage.getItem("yorushokuPersonaProfile");
        router.push(hasProfile ? "/dashboard" : "/onboarding");
      }
    } catch (err) {
      logError("login_exception", "ログイン処理中に予期せぬエラー", { message: String(err) });
      setError("ログイン処理中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10 sm:py-16">

        {/* ブランド */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2f2a45] bg-[#1a1420] px-4 py-1.5 text-xs font-semibold text-[#e85d8a]">
            ✦ NBS AI 文章添削ツール
          </span>
          <h1 className="mt-6 text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
            指名が増える文章を、<br />
            AIが設計する。
          </h1>
          <p className="mt-4 text-[#8b84a8] leading-7">
            写メ日記・オキニトークをプロ水準に仕上げ、<br />
            毎月の指名・来店数を底上げします。
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[#4d4866]">
            ※ 効果には個人差があります。成果を保証するものではありません。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {["100点スコア評価", "添削文章をそのままコピー", "指名導線を自動設計"].map((f) => (
              <span key={f} className="rounded-full border border-[#2f2a45] px-3 py-1 text-xs text-[#8b84a8]">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* ログインフォーム */}
        <div className="rounded-[24px] border border-[#231f36] bg-[#110e1c] p-6 sm:p-8">
          <h2 className="text-lg font-bold">ログイン</h2>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                required
                className="h-13 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-3.5 text-[#f2eefb] placeholder-[#4d4866] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-13 w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-3.5 text-[#f2eefb] placeholder-[#4d4866] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#2f2a45] accent-[#e85d8a]"
              />
              <label htmlFor="rememberMe" className="text-sm text-[#8b84a8]">
                ログイン情報を保存する
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-[#5c1a2e] bg-[#1e0a12] px-4 py-3 text-sm text-[#f87171]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-13 w-full items-center justify-center rounded-2xl bg-[#e85d8a] py-3.5 text-sm font-bold text-white transition hover:bg-[#d4507c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "確認中…" : "ログインする"}
            </button>
          </form>
        </div>

        {/* サインアップ */}
        <p className="mt-6 text-center text-sm text-[#8b84a8]">
          まだアカウントをお持ちでない方は{" "}
          <a href="/signup" className="font-semibold text-[#e85d8a] hover:underline">
            無料で3回試す →
          </a>
        </p>
      </div>
    </main>
  );
}
