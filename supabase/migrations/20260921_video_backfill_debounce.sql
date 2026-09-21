-- video-backfill.yml runs hourly with no debounce, so a listing stuck on a
-- single platform (e.g. YouTube hitting its daily upload quota) got
-- re-selected and fully re-rendered/re-uploaded every single hour,
-- indefinitely -- discovered while tracing a Supabase Cached Egress quota
-- overage back to the same handful of listing videos being rebuilt and
-- deleted 8-12+ times within 5 days. video_backfill_last_attempted_at is an
-- unconditional "we tried" stamp, same pattern as
-- video_refresh_last_attempted_at (see 20260816_video_refresh_tracking.sql)
-- -- it does not track success, only debounces how often a stuck listing
-- gets re-triggered.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS video_backfill_last_attempted_at timestamptz;
