-- 登録時のIPアドレス記録用カラム
-- 目的: Fingerprint + IP + 時刻の複合判定による誤ブロック削減
-- 同じ端末指紋でも別IPからの登録なら別人とみなす（日本の均質環境での誤爆対策）

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS signup_ip TEXT;

-- 既存レコードは NULL のまま（マルチシグナル判定で IP 一致条件に引っかからないので
-- 既存ユーザーが誤ブロックされることはない）
