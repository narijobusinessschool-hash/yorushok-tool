"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TrackPageView() {
  const pathname = usePathname();

  useEffect(() => {
    const raw = localStorage.getItem("yorushokuCurrentUser");
    const userId = raw ? JSON.parse(raw).id : null;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, userId }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
