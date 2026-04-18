import { MetadataRoute } from "next";

const BASE_URL = "https://syamecoach.narijo.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/signup", "/terms", "/privacy", "/tokushoho"],
      disallow: ["/admin", "/dashboard", "/api", "/onboarding", "/mypage", "/verify"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
