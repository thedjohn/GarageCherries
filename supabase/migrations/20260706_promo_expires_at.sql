-- Add promo_expires_at to profiles table
-- Set to 2026-10-31 for users who signed up with the 250th birthday promo (promo=250th).
-- Used to gate free access when paid plans launch via Stripe.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS promo_expires_at timestamptz DEFAULT NULL;
