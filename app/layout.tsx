import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HamburgerMenu from "@/components/HamburgerMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "よるしょく | 写メ日記AI添削",
  description: "夜職専用の写メ日記・オキニトークAI添削ツール。100点満点スコアで指名が変わる文章を設計する。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "よるしょく",
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
      <body className="min-h-full flex flex-col">
        <HamburgerMenu />
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
