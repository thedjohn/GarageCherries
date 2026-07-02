-- 30-day listing expiry with renewal, to keep browse/search results current
-- without relying on sellers to self-report a sale (there's no way to verify
-- a car actually sold, so instead of trying to detect that, listings quietly
-- go stale after 30 days unless the seller renews).
--
-- is_feed_managed exists for forward-compatibility with the not-yet-built
-- dealer bulk-import/data-feed sync (see "Import JSON" / "Sync Now" stubs in
-- the dealer dashboard). Feed-managed listings are meant to have their
-- freshness driven by the sync itself rather than a manual renewal click,
-- so browse queries and the renew UI should skip them once that exists.
-- Nothing sets this true yet since the feed feature doesn't exist.
--
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor).

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_feed_managed boolean NOT NULL DEFAULT false;

-- Backfill existing approved listings so nothing already live disappears
-- immediately once the browse-query filter goes in.
-- listed_at is stored as text (not timestamptz, despite SPEC.md's docs),
-- so it needs an explicit cast before date arithmetic works on it.
UPDATE listings
SET expires_at = listed_at::timestamptz + interval '30 days'
WHERE status = 'approved'
  AND listed_at IS NOT NULL
  AND expires_at IS NULL;
