import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = request.cookies.get("yorushoku_session");

  // ログインしていない場合はトップへ
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 管理者ページは管理者のみ
  if (pathname.startsWith("/admin")) {
    try {
      const user = JSON.parse(session.value);
      if (user.role !== "管理者") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/mypage/:path*",
    "/onboarding/:path*",
  ],
};
