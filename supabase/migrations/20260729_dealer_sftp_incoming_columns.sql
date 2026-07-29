-- Supports the new 'sftp_incoming' feed_protocol (dealers push a file to an
-- SFTP server we host, as opposed to the existing 'sftp' protocol where we
-- pull from a server the dealer hosts). Deliberately no password column --
-- unlike the existing outbound-SFTP columns (feed_password, plaintext), the
-- actual SFTP credential for this direction lives only in SFTPGo's own
-- account store on the VPS; this table only tracks non-secret metadata.
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS feed_sftp_username text,
  ADD COLUMN IF NOT EXISTS feed_sftp_provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS feed_sftp_last_received_at timestamptz;
