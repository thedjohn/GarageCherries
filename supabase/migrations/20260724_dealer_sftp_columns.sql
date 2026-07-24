-- Adds the 6 dealers columns the 2026-07-23 SFTP feed sync feature (commit 917fb76)
-- needed but never got a migration file for. The columns were missing in production
-- until this ran on 2026-07-24, breaking every dealer's dashboard load (the SELECT
-- in app/dealer/dashboard/page.tsx references all of them unconditionally) --
-- see the 2026-07-24 IMPLEMENTATION_STATUS.md entry for the full incident writeup.
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS feed_protocol text,
  ADD COLUMN IF NOT EXISTS feed_host text,
  ADD COLUMN IF NOT EXISTS feed_port integer,
  ADD COLUMN IF NOT EXISTS feed_username text,
  ADD COLUMN IF NOT EXISTS feed_password text,
  ADD COLUMN IF NOT EXISTS feed_remote_path text;
