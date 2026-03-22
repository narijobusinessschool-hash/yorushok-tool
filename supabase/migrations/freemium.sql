-- ============================================================
-- フリーミアム移行マイグレーション
-- 実行場所: Supabase管理画面 > SQL Editor > New query > Run
-- ============================================================

-- 1. membersテーブルにusage管理カラムを追加
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS usage_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_limit  INTEGER NOT NULL DEFAULT 3;

-- 2. 既存の有料会員・管理者を 'nbs' プランに移行（無制限）
UPDATE members
SET plan = 'nbs', usage_limit = 99999
WHERE plan IN ('月額会員', '特別会員')
   OR role = '管理者';

-- 3. それ以外の既存会員を 'free' プランに移行
UPDATE members
SET plan = 'free'
WHERE plan NOT IN ('nbs', 'suspended', 'cancelled');

-- 4. consume_free_usage: 原子的な回数消費ストアドファンクション
--    戻り値: { ok: boolean, remaining: number }
--    nbs会員 → ok=true, remaining=-1（無制限）
--    free残あり → ok=true, remaining=残り回数
--    free上限済 → ok=false, remaining=0
CREATE OR REPLACE FUNCTION consume_free_usage(p_member_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan    TEXT;
  v_count   INTEGER;
  v_limit   INTEGER;
BEGIN
  SELECT plan, usage_count, usage_limit
  INTO v_plan, v_count, v_limit
  FROM members
  WHERE id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'not_found');
  END IF;

  -- NBS会員は無制限
  IF v_plan = 'nbs' THEN
    RETURN json_build_object('ok', true, 'remaining', -1);
  END IF;

  -- 停止・解約
  IF v_plan IN ('suspended', 'cancelled') THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'suspended');
  END IF;

  -- freeで上限到達
  IF v_count >= v_limit THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'limit_exceeded');
  END IF;

  -- 1回消費
  UPDATE members SET usage_count = usage_count + 1 WHERE id = p_member_id;

  RETURN json_build_object('ok', true, 'remaining', v_limit - v_count - 1);
END;
$$;
