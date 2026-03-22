/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function gaPageview(path: string) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_ID, { page_path: path });
}

export function gaEvent(action: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params ?? {});
}

// ========== よるしょく専用イベント ==========

/** ログイン成功 */
export function gaLogin(role: string) {
  gaEvent("login", { method: "email", user_role: role });
}

/** 会員登録完了 */
export function gaSignUp() {
  gaEvent("sign_up", { method: "email" });
}

/** AI添削実行 */
export function gaGenerateDraft(params: {
  category: string;
  bodyScore: number;
  plan: string;
  sellType?: string;
}) {
  gaEvent("generate_draft", {
    category: params.category,
    body_score: params.bodyScore,
    plan: params.plan,
    sell_type: params.sellType ?? "未設定",
  });
}

/** アクセス分析使用（NBSのみ） */
export function gaUseAccessAnalysis() {
  gaEvent("use_access_analysis");
}

/** 問い合わせ送信 */
export function gaSubmitInquiry() {
  gaEvent("submit_inquiry");
}

/** 無料→NBS誘導表示（フリープランがNBSロック画面を見た時） */
export function gaNbsUpsellView(trigger: string) {
  gaEvent("nbs_upsell_view", { trigger });
}

/** オンボーディング完了 */
export function gaCompleteOnboarding(typeName: string) {
  gaEvent("complete_onboarding", { type_name: typeName });
}
