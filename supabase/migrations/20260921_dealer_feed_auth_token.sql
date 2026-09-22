-- Some dealer feed hosts sit behind a server-side rate limiter that can 403
-- a legitimate request during a traffic burst from shared hosting ranges
-- (seen with Garage Kept Motors / All Auto Network -- their own admission,
-- not a bug on our end). AAN's support team issued a bearer token that
-- guarantees a pass through their rate limiter. feed_auth_token is optional
-- and only used on the plain-HTTPS feed branch (not SFTP); most dealers
-- will never set it.
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS feed_auth_token text;
