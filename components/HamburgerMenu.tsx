"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { gaSubmitInquiry, gaUpgradePromptView } from "@/lib/ga";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "管理者" | "一般会員";
  plan?: string;
};

const CURRENT_USER_KEY = "yorushokuCurrentUser";

const adminMenuItems = [
  { label: "管理画面TOP", href: "/admin" },
  { label: "会員一覧", href: "/admin/members" },
  { label: "問い合わせ一覧", href: "/admin/inquiries" },
  { label: "学習モード", href: "/admin/admin/learning" },
  { label: "統計・ログ", href: "/admin/logs" },
];

export default function HamburgerMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactText, setContactText] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) setUser(JSON.parse(raw));
  }, [pathname]);

  // 管理者の場合のみ未読件数を定期取得
  useEffect(() => {
    if (user?.role !== "管理者") return;
    async function fetchUnread() {
      const res = await fetch("/api/inquiries?unread=1");
      const json = await res.json();
      setUnreadCount(json.count ?? 0);
    }
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, [user?.role]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (pathname === "/" || !user) return null;

  const isNbs = user.plan === "nbs";

  async function handleContactSubmit() {
    if (!contactText.trim() || !user) return;
    setContactSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: user.id, name: user.name, message: contactText.trim() }),
      });
      gaSubmitInquiry();
      setContactDone(true);
      setContactText("");
      setTimeout(() => {
        setContactDone(false);
        setShowContact(false);
      }, 2000);
    } finally {
      setContactSending(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    document.cookie = "yorushoku_session=; path=/; max-age=0";
    router.push("/");
  }

  return (
    <div ref={menuRef} className="fixed right-4 top-4 z-50">
      {/* ハンバーガーボタン */}
      <div className="relative inline-block">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full bg-white shadow-md ring-1 ring-[#ebe7ef] transition hover:bg-[#fdf6f9]"
          aria-label="メニュー"
        >
          <span className={`h-[2px] w-5 rounded-full bg-[#2c2933] transition-all duration-200 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`h-[2px] w-5 rounded-full bg-[#2c2933] transition-all duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`h-[2px] w-5 rounded-full bg-[#2c2933] transition-all duration-200 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </button>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#e85d8a] px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      {/* ドロップダウンメニュー */}
      {open && !showContact && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white py-2 shadow-xl ring-1 ring-[#ebe7ef]">
          {/* ユーザー情報 */}
          <div className="border-b border-[#f0ecf4] px-4 py-3">
            <p className="text-xs text-[#9b92a4]">ログイン中</p>
            <p className="mt-0.5 text-sm font-semibold text-[#2c2933]">{user.name}</p>
            {user.role === "管理者" ? (
              <span className="mt-1 inline-block rounded-full bg-[#f4e2ea] px-2 py-0.5 text-xs font-medium text-[#7a2e4d]">管理者</span>
            ) : (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${isNbs ? "bg-[#f4e2ea] text-[#7a2e4d]" : "bg-[#f0ecf4] text-[#9b92a4]"}`}>
                {isNbs ? "NBSメンバー" : "無料プラン"}
              </span>
            )}
          </div>

          {user.role === "管理者" ? (
            /* 管理者メニュー */
            <div className="py-1">
              {adminMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { setOpen(false); if (item.href === "/admin/inquiries") setUnreadCount(0); }}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-[#faf7fc] ${pathname === item.href ? "font-semibold text-[#a3476b]" : "text-[#2c2933]"}`}
                >
                  {item.label}
                  {item.href === "/admin/inquiries" && unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#e85d8a] px-1 text-[10px] font-bold text-white leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            /* 一般会員メニュー */
            <div className="py-1">
              <a
                href="https://www.narijo.net/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 text-sm text-[#2c2933] transition hover:bg-[#faf7fc]"
              >
                NBSスクール
                <span className="text-[10px] text-[#9b92a4]">↗</span>
              </a>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition hover:bg-[#faf7fc] ${pathname === "/dashboard" ? "font-semibold text-[#a3476b]" : "text-[#2c2933]"}`}
              >
                ダッシュボード
              </Link>
              <Link
                href="/dashboard/new"
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition hover:bg-[#faf7fc] ${pathname === "/dashboard/new" ? "font-semibold text-[#a3476b]" : "text-[#2c2933]"}`}
              >
                添削を行う
              </Link>
              {isNbs ? (
                <Link
                  href="/dashboard/access"
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 text-sm transition hover:bg-[#faf7fc] ${pathname === "/dashboard/access" ? "font-semibold text-[#a3476b]" : "text-[#2c2933]"}`}
                >
                  アクセス分析・改善提案
                </Link>
              ) : (
                <div
                  className="flex items-center justify-between px-4 py-2.5 text-sm text-[#c8c2dc] cursor-not-allowed select-none"
                  onMouseEnter={() => gaUpgradePromptView("menu_access_analysis")}
                  onTouchStart={() => gaUpgradePromptView("menu_access_analysis")}
                >
                  アクセス分析・改善提案
                  <span className="rounded-full bg-[#f4e2ea] px-1.5 py-0.5 text-[10px] font-medium text-[#a3476b]">NBS</span>
                </div>
              )}
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition hover:bg-[#faf7fc] ${pathname === "/onboarding" ? "font-semibold text-[#a3476b]" : "text-[#2c2933]"}`}
              >
                診断
              </Link>
              <Link
                href="/mypage"
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition hover:bg-[#faf7fc] ${pathname === "/mypage" ? "font-semibold text-[#a3476b]" : "text-[#2c2933]"}`}
              >
                マイページ
              </Link>
              <button
                onClick={() => setShowContact(true)}
                className="block w-full px-4 py-2.5 text-left text-sm text-[#2c2933] transition hover:bg-[#faf7fc]"
              >
                機能改善問合せ
              </button>
            </div>
          )}

          {/* ログアウト */}
          <div className="border-t border-[#f0ecf4] pt-1">
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2.5 text-left text-sm text-[#b03060] transition hover:bg-[#fdf0f4]"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}

      {/* 問い合わせパネル */}
      {open && showContact && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-[#ebe7ef]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#2c2933]">機能改善問合せ</h3>
            <button
              onClick={() => setShowContact(false)}
              className="text-xs text-[#9b92a4] hover:text-[#2c2933] transition"
            >
              ← 戻る
            </button>
          </div>
          {contactDone ? (
            <p className="py-4 text-center text-sm font-medium text-[#a3476b]">送信しました！</p>
          ) : (
            <>
              <textarea
                value={contactText}
                onChange={(e) => setContactText(e.target.value)}
                placeholder="改善してほしい機能や気になることをご記入ください"
                className="w-full rounded-xl border border-[#e8e2f0] bg-[#faf7fc] p-3 text-sm text-[#2c2933] placeholder-[#c8c2dc] focus:outline-none focus:ring-1 focus:ring-[#a3476b] resize-none"
                rows={4}
              />
              <button
                onClick={handleContactSubmit}
                disabled={contactSending || !contactText.trim()}
                className="mt-2 w-full rounded-xl bg-[#a3476b] py-2 text-sm font-medium text-white transition hover:bg-[#8a3459] disabled:opacity-40"
              >
                {contactSending ? "送信中..." : "送信する"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
