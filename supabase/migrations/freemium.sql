ALTER TABLE members DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  type text NOT NULL,
  message text NOT NULL,
  detail jsonb,
  user_id text
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  event_type text NOT NULL,
  user_id text,
  meta jsonb
);

ALTER TABLE error_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS member_profiles (
  member_id text PRIMARY KEY,
  profile_data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS draft_results (
  id text PRIMARY KEY,
  member_id text NOT NULL,
  created_at timestamptz NOT NULL,
  category text NOT NULL,
  title text DEFAULT '',
  original_text text DEFAULT '',
  improved_text text DEFAULT '',
  title_score integer,
  body_score integer NOT NULL DEFAULT 0,
  profile_type_name text DEFAULT '',
  industry text DEFAULT '',
  prefecture text DEFAULT '',
  purpose text DEFAULT '',
  status text DEFAULT '下書き'
);

CREATE TABLE IF NOT EXISTS draft_outcomes (
  draft_id text PRIMARY KEY,
  member_id text NOT NULL,
  used text DEFAULT '使ってない',
  reservation text DEFAULT 'なし',
  nomination text DEFAULT 'なし',
  visit text DEFAULT 'なし',
  memo text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE member_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE draft_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE draft_outcomes DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS access_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  period text NOT NULL,
  stats jsonb NOT NULL,
  daily_data jsonb,
  patterns jsonb,
  suggestions jsonb,
  urgent_actions jsonb,
  posting_timing text
);

ALTER TABLE access_analyses DISABLE ROW LEVEL SECURITY;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER NOT NULL DEFAULT 3;

UPDATE members
SET plan = 'nbs', usage_limit = 99999
WHERE plan IN ('月額会員', '特別会員')
   OR role = '管理者';

UPDATE members
SET plan = 'free'
WHERE plan NOT IN ('nbs', 'suspended', 'cancelled');

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

  IF v_count >= v_limit THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'limit_exceeded');
  END IF;

  UPDATE members SET usage_count = usage_count + 1 WHERE id = p_member_id;

  RETURN json_build_object('ok', true, 'remaining', v_limit - v_count - 1);
END;
$$;
