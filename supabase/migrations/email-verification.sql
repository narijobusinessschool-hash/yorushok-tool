-- メール認証機能のための列追加
-- 目的: 存在しないメールアドレスでの登録防止＋Fingerprint回避対策の二重防御

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- 既存会員を全員 verified に設定（既存ユーザーの影響を防ぐ／ログイン拒否されないように）
UPDATE members
SET email_verified = true
WHERE email_verified = false AND verification_token IS NULL;

-- トークン検索高速化
CREATE INDEX IF NOT EXISTS idx_members_verification_token
  ON members(verification_token)
  WHERE verification_token IS NOT NULL;
