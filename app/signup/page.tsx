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
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("email", email.trim())
        .single();

      if (existing) {
        setError("このメールアドレスはすでに登録されています。");
        return;
      }

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
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10 sm:py-16">

        {/* ブランド */}
        <div className="mb-10">
          <a href="/" className="inline-flex items-center gap-2 text-[#8b84a8] text-sm hover:text-[#f2eefb] transition">
            ← ログインページへ
          </a>
          <h1 className="mt-6 text-[2rem] font-bold leading-tight tracking-tight">
            まず、無料で試す。
          </h1>
          <p className="mt-3 text-[#8b84a8] leading-7">
            クレジットカード不要。メール登録だけで今すぐ使えます。
          </p>

          {/* 特典リスト */}
          <div className="mt-6 space-y-3">
            {[
              { icon: "✦", text: "写メ日記・オキニトークをAIが添削" },
              { icon: "✦", text: "100点満点スコアで改善ポイントが一目瞭然" },
              { icon: "✦", text: "添削後の文章はそのままコピーして使える" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <span className="mt-0.5 text-[#e85d8a] text-sm">{item.icon}</span>
                <span className="text-sm text-[#c8c2dc]">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#3d1429] bg-[#1e0a12] px-4 py-2">
            <span className="text-xs font-bold text-[#e85d8a]">無料 3回</span>
            <span className="text-xs text-[#8b84a8]">使い切ったら月額9,800円で無制限に</span>
          </div>
        </div>

        {/* 登録フォーム */}
        <div className="rounded-[24px] border border-[#231f36] bg-[#110e1c] p-6 sm:p-8">
          <h2 className="text-lg font-bold">新規登録</h2>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
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
                className="w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-3.5 text-[#f2eefb] placeholder-[#4d4866] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                パスワード（8文字以上）
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-3.5 text-[#f2eefb] placeholder-[#4d4866] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[#c8c2dc]">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-2xl border border-[#2f2a45] bg-[#0e0c18] px-4 py-3.5 text-[#f2eefb] placeholder-[#4d4866] outline-none transition focus:border-[#e85d8a] focus:ring-2 focus:ring-[#e85d8a]/20"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-[#5c1a2e] bg-[#1e0a12] px-4 py-3 text-sm text-[#f87171]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-[#e85d8a] py-3.5 text-sm font-bold text-white transition hover:bg-[#d4507c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "登録中…" : "無料で登録してツールを使う →"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#8b84a8]">
          すでにアカウントをお持ちの方は{" "}
          <a href="/" className="font-semibold text-[#e85d8a] hover:underline">
            ログイン
          </a>
        </p>
      </div>
    </main>
  );
}
