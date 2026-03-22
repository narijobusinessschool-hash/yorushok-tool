/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-S25Z2KWZJN";

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

/**
 * NBS升格導線が表示された
 * trigger例: "usage_counter" | "limit_reached_banner" | "plan_limit_modal" | "menu_access_analysis"
 */
export function gaUpgradePromptView(trigger: string) {
  gaEvent("upgrade_prompt_view", { trigger });
}

/**
 * NBS入会ボタンをクリックした
 * trigger例: "plan_limit_modal" | "usage_counter"
 */
export function gaUpgradeClick(trigger: string) {
  gaEvent("upgrade_click", { trigger });
}

/** 無料上限に到達した瞬間 */
export function gaLimitReached() {
  gaEvent("generate_limit_reached");
}

/** オンボーディング完了 */
export function gaCompleteOnboarding(typeName: string) {
  gaEvent("complete_onboarding", { type_name: typeName });
}
