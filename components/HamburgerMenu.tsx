"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "管理者" | "一般会員";
};

const CURRENT_USER_KEY = "yorushokuCurrentUser";

const memberMenuItems = [
  { label: "新規添削", href: "/dashboard/new" },
  { label: "添削履歴", href: "/dashboard" },
  { label: "マイページ", href: "/mypage" },
];

const adminMenuItems = [
  { label: "新規添削", href: "/dashboard/new" },
  { label: "添削履歴", href: "/dashboard" },
  { label: "管理画面TOP", href: "/admin" },
  { label: "会員一覧", href: "/admin/members" },
  { label: "学習モード", href: "/admin/admin/learning" },
  { label: "マイページ", href: "/mypage" },
];

export default function HamburgerMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) setUser(JSON.parse(raw));
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // ログインページでは表示しない
  if (pathname === "/" || !user) return null;

  const menuItems = user.role === "管理者" ? adminMenuItems : memberMenuItems;

  function handleLogout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    document.cookie = "yorushoku_session=; path=/; max-age=0";
    router.push("/");
  }

  return (
    <div ref={menuRef} className="fixed right-4 top-4 z-50">
      {/* ハンバーガーボタン */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full bg-white shadow-md ring-1 ring-[#ebe7ef] transition hover:bg-[#fdf6f9]"
        aria-label="メニュー"
      >
        <span
          className={`h-[2px] w-5 rounded-full bg-[#2c2933] transition-all duration-200 ${open ? "translate-y-[7px] rotate-45" : ""}`}
        />
        <span
          className={`h-[2px] w-5 rounded-full bg-[#2c2933] transition-all duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`h-[2px] w-5 rounded-full bg-[#2c2933] transition-all duration-200 ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </button>

      {/* ドロップダウンメニュー */}
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white py-2 shadow-xl ring-1 ring-[#ebe7ef]">
          {/* ユーザー名 */}
          <div className="border-b border-[#f0ecf4] px-4 py-3">
            <p className="text-xs text-[#9b92a4]">ログイン中</p>
            <p className="mt-0.5 text-sm font-semibold text-[#2c2933]">{user.name}</p>
            {user.role === "管理者" && (
              <span className="mt-1 inline-block rounded-full bg-[#f4e2ea] px-2 py-0.5 text-xs font-medium text-[#7a2e4d]">
                管理者
              </span>
            )}
          </div>

          {/* メニュー項目 */}
          <div className="py-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition hover:bg-[#faf7fc] ${
                  pathname === item.href
                    ? "font-semibold text-[#a3476b]"
                    : "text-[#2c2933]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

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
    </div>
  );
}
