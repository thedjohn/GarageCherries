-- Phase 4 of the Instagram monetization plan (email lead capture): the spec
-- wants first name (optional) and signup source captured alongside email.
-- Reuses the existing newsletter_subscribers table/flow rather than a new
-- one -- "date subscribed" is already covered by the table's default
-- created_at.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS source text;
