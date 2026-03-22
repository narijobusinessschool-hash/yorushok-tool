"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TrackPageView() {
  const pathname = usePathname();

  useEffect(() => {
    const raw = localStorage.getItem("yorushokuCurrentUser");
    if (!raw) return;
    const user = JSON.parse(raw);
    // 管理者はカウントから除外
    if (user?.role === "管理者") return;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, userId: user.id }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
