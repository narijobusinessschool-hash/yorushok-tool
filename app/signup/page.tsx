"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください。");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }

    setLoading(true);

    try {
      // メール重複チェック
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("email", email.trim())
        .single();

      if (existing) {
        setError("このメールアドレスはすでに登録されています。");
        return;
      }

      // 新規会員登録（フリープラン）
      const { data, error: insertError } = await supabase
        .from("members")
        .insert({
          email: email.trim(),
          password,
          role: "一般会員",
          status: "契約中",
          plan: "free",
          usage_count: 0,
          usage_limit: 3,
          usage_permission: true,
          note: "",
        })
        .select()
        .single();

      if (insertError || !data) {
        setError("登録に失敗しました。もう一度お試しください。");
        return;
      }

      // 自動ログイン
      const userData = { id: data.id, name: data.name ?? "", email: data.email, role: data.role };
      localStorage.setItem("yorushokuCurrentUser", JSON.stringify(userData));
      document.cookie = `yorushoku_session=${encodeURIComponent(JSON.stringify({ role: data.role }))}; path=/; max-age=86400`;

      router.push("/onboarding");
    } catch {
      setError("登録処理中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] text-[#1f1f23]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(31,31,35,0.08)] ring-1 ring-[#ebe7ef] sm:p-8">
          <div>
            <p className="text-sm font-medium text-[#a3476b]">無料で始める</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              写メ日記をAIが無料で添削
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#6b6773]">
              メール登録だけで今すぐ使えます。クレジットカード不要。
              <br />
              無料で3回まで添削できます。
            </p>
          </div>

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#2c2933]">
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
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#2c2933]">
                パスワード（8文字以上）
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

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[#2c2933]">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 w-full rounded-2xl border border-[#d9d3df] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
              />
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
              {loading ? "登録中…" : "無料で登録してツールを使う"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#7b7682]">
            すでにアカウントをお持ちの方は{" "}
            <a href="/" className="font-medium text-[#a3476b] hover:underline">
              ログイン
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
