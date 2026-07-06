-- Idempotency columns so promo expiry emails are never sent twice
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS promo_expiry_notified_at timestamptz DEFAULT NULL;

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS promo_expiry_notified_at timestamptz DEFAULT NULL;

ALTER TABLE advertisers
  ADD COLUMN IF NOT EXISTS promo_expiry_notified_at timestamptz DEFAULT NULL;
