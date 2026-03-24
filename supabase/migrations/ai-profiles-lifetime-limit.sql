-- AI学習プロフィール & 無料枠ライフタイム制への変更
-- Created: 2026-03-24
-- 変更内容:
--   1. user_ai_profiles テーブル追加
--   2. 無料枠: 月次リセット廃止 → 初回登録から20回のライフタイム制に変更
--   3. consume_free_usage 関数から月次リセットロジックを削除

-- 1. AI学習プロフィールテーブル
CREATE TABLE IF NOT EXISTS user_ai_profiles (
  member_id TEXT PRIMARY KEY,
  profile_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_ai_profiles DISABLE ROW LEVEL SECURITY;

-- 2. 無料枠の上限を20回（ライフタイム）に更新
ALTER TABLE members
  ALTER COLUMN usage_limit SET DEFAULT 20;

UPDATE members
  SET usage_limit = 20
  WHERE plan = 'free' AND usage_limit <= 10;

-- 3. consume_free_usage を月次リセットなしに置き換え
CREATE OR REPLACE FUNCTION consume_free_usage(p_member_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan  TEXT;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT plan, usage_count, usage_limit
    INTO v_plan, v_count, v_limit
    FROM members
   WHERE id = p_member_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'not_found');
  END IF;

  IF v_plan = 'nbs' THEN
    RETURN json_build_object('ok', true, 'remaining', -1);
  END IF;

  IF v_plan IN ('suspended', 'cancelled') THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'suspended');
  END IF;

  v_limit := COALESCE(v_limit, 20);
  IF v_count >= v_limit THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'limit_exceeded');
  END IF;

  UPDATE members SET usage_count = usage_count + 1 WHERE id = p_member_id;

  RETURN json_build_object('ok', true, 'remaining', v_limit - v_count - 1);
END;
$$;
