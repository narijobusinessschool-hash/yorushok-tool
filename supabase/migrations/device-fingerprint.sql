-- 端末指紋（デバイスフィンガープリント）カラム追加
-- 目的: 無料枠使い切り後のメアド変更による「転生」対策
-- 既存データへの影響: なし（NULL許容、既存レコードは NULL のまま）

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- 重複検知を高速化するための部分インデックス（NULL値は除外）
CREATE INDEX IF NOT EXISTS idx_members_device_fingerprint
  ON members(device_fingerprint)
  WHERE device_fingerprint IS NOT NULL;
