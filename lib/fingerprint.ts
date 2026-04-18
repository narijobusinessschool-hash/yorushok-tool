// 端末指紋（デバイスフィンガープリント）取得ユーティリティ。
// 登録時・ログイン時のみ呼び出し、API Key は公開可能な Public Key を使用。
// 動作失敗時（広告ブロッカー・ネットワーク不調等）は null を返し、
// API 側でフォールバック処理される設計。
export async function getDeviceFingerprint(): Promise<string | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY;
    if (!apiKey) return null;
    const mod = await import("@fingerprintjs/fingerprintjs-pro");
    const fp = await mod.load({ apiKey });
    const result = await fp.get();
    return result?.visitorId ?? null;
  } catch {
    return null;
  }
}
