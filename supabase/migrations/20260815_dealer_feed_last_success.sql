-- Tracks the last time an 'https' or outbound-'sftp' dealer feed actually
-- synced successfully, distinct from feed_last_synced_at (which is stamped
-- on every attempt, success or failure, so it can't be used on its own to
-- detect a feed that's silently been failing). Mirrors the role
-- feed_sftp_last_received_at already plays for the 'sftp_incoming' protocol,
-- so all three feed protocols can now be checked for staleness the same way.
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS feed_last_success_at timestamptz;
