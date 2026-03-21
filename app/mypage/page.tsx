"use client";

import { useEffect, useState } from "react";

type SavedProfile = {
  basic: {
    character: string;
    industry: string;
    prefecture: string;
    mainGoal: string;
    priceRange: string;
    shopUrl: string;
  };
  persona: {
    ageRange: string;
    jobType: string;
    lifestyle: string[];
    visitReasons: string[];
    emotionNeeds: string[];
    worries: string[];
    triggers: string[];
    tone: string[];
    sources: string[];
    decisionPoints: string[];
  };
  usp: {
    impressions: string[];
    strengthStyles: string[];
    repeatReasons: string[];
    summary: string[];
  };
  stp: {
    segment: string;
    target: string;
    positioning: string;
  };
  diagnosis: {
    typeName: string;
    bestTarget: string;
    strengths: string;
    personaText: string;
  };
  updatedAt: string;
};

export default function MyPage() {
  const [profile, setProfile] = useState<SavedProfile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("yorushokuPersonaProfile");
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f6f4f7] px-4 py-10 text-[#1f1f23] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-[#ebe7ef]">
          <p className="text-sm font-medium text-[#a3476b]">マイページ</p>
          <h1 className="mt-2 text-3xl font-bold">診断結果がまだありません</h1>
          <p className="mt-4 text-sm leading-7 text-[#66616d]">
            まずは初回設定を完了すると、ここに診断結果が表示されます。
          </p>
          <a
            href="/onboarding"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
          >
            診断をはじめる
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#a3476b]">マイページ</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            診断結果
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#66616d]">
            いつでも見返せるように保存された診断結果です。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <p className="text-sm font-medium text-[#a3476b]">あなたは</p>
              <h2 className="mt-3 text-3xl font-bold text-[#7a2e4d]">
                {profile.diagnosis.typeName}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">こういった人を狙うといい</p>
                <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                  {profile.diagnosis.bestTarget}
                </p>
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
                <p className="text-sm font-medium text-[#a3476b]">あなたの強み</p>
                <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                  {profile.diagnosis.strengths}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">想定ペルソナ</p>
              <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                {profile.diagnosis.personaText}
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">STP要約</p>
              <div className="mt-4 space-y-2 text-sm text-[#5d5965]">
                <p>・S：{profile.stp.segment || "未設定"}</p>
                <p>・T：{profile.stp.target || "未設定"}</p>
                <p>・P：{profile.stp.positioning || "未設定"}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">基本情報</p>
              <div className="mt-4 space-y-2 text-sm text-[#5d5965]">
                <p>・キャラ設定：{profile.basic.character || "未設定"}</p>
                <p>・業種：{profile.basic.industry || "未設定"}</p>
                <p>・都道府県：{profile.basic.prefecture || "未設定"}</p>
                <p>・主目的：{profile.basic.mainGoal || "未設定"}</p>
                <p>・価格帯：{profile.basic.priceRange || "未設定"}</p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">USP候補</p>
              <p className="mt-4 text-sm leading-7 text-[#5d5965]">
                {profile.usp.summary.join(" / ")}
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">更新日時</p>
              <p className="mt-4 text-sm text-[#5d5965]">
                {new Date(profile.updatedAt).toLocaleString("ja-JP")}
              </p>
            </div>

            <a
              href="/onboarding"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-6 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
            >
              診断をやり直す
            </a>
          </aside>
        </div>
      </div>
    </main>
  );
}