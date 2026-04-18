"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type VerifyState =
  | { status: "pending" }
  | { status: "verified"; email: string; message: string }
  | { status: "already_verified"; email: string; message: string }
  | { status: "expired"; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>({ status: "pending" });

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

        if (res.ok && data.status === "verified") {
          setState({ status: "verified", email: data.email, message: data.message });
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
  }, [token]);

  const isSuccess =
    state.status === "verified" || state.status === "already_verified";

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

          {isSuccess && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e3a1e] text-3xl text-[#4ade80]">
                ✓
              </div>
              <h1 className="mb-3 text-xl font-bold">
                {state.status === "verified"
                  ? "メール認証が完了しました"
                  : "すでに認証済みです"}
              </h1>
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
