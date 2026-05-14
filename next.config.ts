import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 旧 Vercel ドメインから新ドメインへ 308 永続リダイレクト（SEO維持）
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "yorushok-tool.vercel.app",
          },
        ],
        destination: "https://syamecoach.narijo.net/:path*",
        permanent: true,
      },
    ];
  },
  // 購入者向け限定ページ（public/nbs-thanks.html）を拡張子なしURLで配信
  async rewrites() {
    return [
      {
        source: "/nbs-thanks",
        destination: "/nbs-thanks.html",
      },
    ];
  },
};

export default nextConfig;
