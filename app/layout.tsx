import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import HamburgerMenu from "@/components/HamburgerMenu";
import TrackPageView from "@/components/TrackPageView";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const GA_ID = "G-S25Z2KWZJN";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://yorushok-tool.vercel.app";

export const metadata: Metadata = {
  title: "シャメコーチ | 写メ日記AI添削ツール",
  description: "夜職専用の写メ日記・オキニトークAI添削ツール。100点満点スコアで指名が増える文章をAIが設計。シャメコーチで毎月の指名・来店数を底上げ。",
  keywords: ["写メ日記 添削", "写メ日記 AI", "夜職 文章 AI", "指名 増やす", "写メ日記 コーチ", "シャメコーチ", "キャバクラ 文章", "夜職 AI ツール"],
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: BASE_URL,
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "シャメコーチ | 写メ日記AI添削ツール",
    description: "夜職専用の写メ日記・オキニトークAI添削ツール。100点満点スコアで指名が増える文章をAIが設計。",
    url: BASE_URL,
    siteName: "シャメコーチ",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: "シャメコーチ | 写メ日記AI添削ツール",
    description: "夜職専用。AIが写メ日記を添削・スコアリングして指名を増やす文章を設計します。",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION ?? "",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "シャメコーチ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}</Script>
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics />
        <HamburgerMenu />
        <TrackPageView />
        {children}
        <footer className="mt-auto border-t border-[#1a1628] bg-[#09070f] px-5 py-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#4d4866]">
            <a href="/terms" className="hover:text-[#8b84a8] transition">利用規約</a>
            <a href="/privacy" className="hover:text-[#8b84a8] transition">プライバシーポリシー</a>
            <a href="/tokushoho" className="hover:text-[#8b84a8] transition">特定商取引法に基づく表記</a>
          </div>
          <p className="mt-3 text-xs text-[#2d2840]">© 2026 NBS（Narijo Business School）</p>
        </footer>
      </body>
    </html>
  );
}
