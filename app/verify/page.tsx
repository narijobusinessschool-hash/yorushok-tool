"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type User = {
  id: string | number;
  name: string;
  email: string;
  role: string;
  plan: string;
};

type VerifyState =
  | { status: "pending" }
  | { status: "verified"; user: User; message: string }
  | { status: "already_verified"; email: string; message: string }
  | { status: "expired"; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>({ status: "pending" });
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({
        status: "invalid",
        message: "認証リンクが無効です。メールに記載のURLを再度ご確認ください。",
      });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.status === "verified" && data.user) {
          // 自動ログイン: localStorage + session cookie をセットしてダッシュボードへ
          localStorage.setItem("yorushokuCurrentUser", JSON.stringify(data.user));
          document.cookie = `yorushoku_session=${encodeURIComponent(
            JSON.stringify({ role: data.user.role }),
          )}; path=/; max-age=86400`;
          setState({ status: "verified", user: data.user, message: data.message });
          setRedirecting(true);
          setTimeout(() => {
            if (data.user.role === "管理者") {
              router.push("/admin");
            } else {
              router.push("/dashboard");
            }
          }, 1500);
        } else if (res.ok && data.status === "already_verified") {
          setState({
            status: "already_verified",
            email: data.email,
            message: data.message,
          });
        } else if (res.status === 410) {
          setState({ status: "expired", message: data.message });
        } else {
          setState({
            status: "invalid",
            message: data.message ?? "認証に失敗しました。",
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "通信エラーが発生しました。時間を置いて再度お試しください。",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10">
        <div className="w-full rounded-[24px] border border-[#231f36] bg-[#110e1c] p-8 text-center">
          {state.status === "pending" && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#231f36] border-t-[#e85d8a]" />
              <p className="text-sm text-[#c8c2dc]">認証中…</p>
            </>
          )}

          {state.status === "verified" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e3a1e] text-3xl text-[#4ade80]">
                ✓
              </div>
              <h1 className="mb-3 text-xl font-bold">
                メール認証が完了しました
              </h1>
              <p className="mb-6 text-sm leading-7 text-[#c8c2dc]">
                {redirecting
                  ? "自動的にダッシュボードへ移動します…"
                  : state.message}
              </p>
              <div className="mx-auto h-1 w-1/2 overflow-hidden rounded-full bg-[#231f36]">
                <div className="h-full animate-[pulse_1s_ease-in-out_infinite] bg-[#e85d8a]" />
              </div>
            </>
          )}

          {state.status === "already_verified" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e3a1e] text-3xl text-[#4ade80]">
                ✓
              </div>
              <h1 className="mb-3 text-xl font-bold">すでに認証済みです</h1>
              <p className="mb-6 text-sm leading-7 text-[#c8c2dc]">
                {state.message}
              </p>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#e85d8a] py-3 text-sm font-bold text-white transition hover:bg-[#d4507c]"
              >
                ログインする →
              </Link>
            </>
          )}

          {state.status === "expired" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#3a2e1e] text-3xl text-[#fb923c]">
                ⏱
              </div>
              <h1 className="mb-3 text-xl font-bold">リンクの有効期限切れ</h1>
              <p className="mb-6 text-sm leading-7 text-[#c8c2dc]">
                {state.message}
              </p>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#e85d8a] py-3 text-sm font-bold text-white transition hover:bg-[#d4507c]"
              >
                ログイン画面へ
              </Link>
            </>
          )}

          {(state.status === "invalid" || state.status === "error") && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#3a1e1e] text-3xl text-[#f87171]">
                ✗
              </div>
              <h1 className="mb-3 text-xl font-bold">認証に失敗しました</h1>
              <p className="mb-6 text-sm leading-7 text-[#c8c2dc]">
                {state.message}
              </p>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#e85d8a] py-3 text-sm font-bold text-white transition hover:bg-[#d4507c]"
              >
                ログイン画面へ
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
