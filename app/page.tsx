"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
      const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
      setEmail(savedEmail ?? "");
      setPassword(savedPassword ?? "");
      setRememberMe(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: dbError } = await supabase
        .from("members")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password)
        .single();

      if (dbError || !data) {
        setError("メールアドレスまたはパスワードが違います。");
        return;
      }

      if (data.status === "停止中") {
        setError("このアカウントは現在利用停止中です。管理者にお問い合わせください。");
        return;
      }

      if (data.status === "解約") {
        setError("このアカウントは解約済みです。管理者にお問い合わせください。");
        return;
      }

      if (!data.usage_permission) {
        setError("現在このアカウントの利用が制限されています。管理者にお問い合わせください。");
        return;
      }

      const userData = { id: data.id, name: data.name, email: data.email, role: data.role };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

      // ミドルウェア用Cookieをセット（24時間）
      document.cookie = `yorushoku_session=${encodeURIComponent(JSON.stringify({ role: data.role }))}; path=/; max-age=86400`;

      if (rememberMe) {
        localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify({ email: email.trim(), password }));
      } else {
        localStorage.removeItem(SAVED_LOGIN_KEY);
      }

      if (data.role === "管理者") {
        router.push("/admin");
      } else {
        const hasProfile = localStorage.getItem("yorushokuPersonaProfile");
        router.push(hasProfile ? "/dashboard" : "/onboarding");
      }
    } catch {
      setError("ログイン処理中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] text-[#1f1f23]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <section className="flex flex-col justify-between px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#d9d3df] bg-white px-4 py-2 text-sm font-medium text-[#7a2e4d] shadow-sm">
              会員制 AI 文章添削ツール
            </div>

            <div className="mt-10 max-w-xl">
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                売れる文章は、
                <br />
                才能ではなく
                <br />
                設計で決まる。
              </h1>

              <p className="mt-6 text-base leading-8 text-[#5b5864] sm:text-lg">
                写メ日記・オキニトーク・SNS投稿を、
                予約・来店・指名に繋がる形へ。
                あなたのキャラ設定、ターゲット、USPに合わせて
                最適な文章提案を行います。
              </p>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#e7e2ea]">
                <p className="text-sm text-[#6a6572]">対応カテゴリ</p>
                <p className="mt-2 text-lg font-semibold">写メ日記 / オキニ</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#e7e2ea]">
                <p className="text-sm text-[#6a6572]">分析軸</p>
                <p className="mt-2 text-lg font-semibold">共感 / 集客 / 指名</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#e7e2ea]">
                <p className="text-sm text-[#6a6572]">利用形式</p>
                <p className="mt-2 text-lg font-semibold">承認制会員のみ</p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-sm text-[#7b7682]">
            予約に繋がる文章設計を、毎日の投稿に。
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(31,31,35,0.08)] ring-1 ring-[#ebe7ef] sm:p-8">
            <div>
              <p className="text-sm font-medium text-[#a3476b]">ログイン</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                承認済み会員専用ページ
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6b6773]">
                管理者から発行されたアカウントでログインしてください。
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#2c2933]"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  required
                  className="h-12 w-full rounded-2xl border border-[#d9d3df] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#2c2933]"
                >
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 w-full rounded-2xl border border-[#d9d3df] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#d9d3df] accent-[#a3476b]"
                />
                <label htmlFor="rememberMe" className="text-sm text-[#5b5864]">
                  ログイン情報を保存する
                </label>
              </div>

              {error && (
                <p className="rounded-xl bg-[#fdf0f4] px-4 py-3 text-sm text-[#b03060]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#a3476b] text-sm font-semibold text-white transition hover:bg-[#8c3c5b] disabled:cursor-not-allowed disabled:bg-[#d2afbe]"
              >
                {loading ? "確認中…" : "ログインする"}
              </button>
            </form>

            <div className="mt-8 rounded-2xl bg-[#f8f4f7] p-4">
              <p className="text-sm font-semibold text-[#2e2a3b]">
                このツールでできること
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#66616d]">
                <li>・文章の100点評価</li>
                <li>・予約導線を意識した添削提案</li>
                <li>・履歴保存と成果記録</li>
                <li>・ターゲット別の文章最適化</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
