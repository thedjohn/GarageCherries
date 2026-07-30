-- Instagram posting was previously fire-and-forget with no success/failure
-- ever recorded, unlike Facebook/YouTube/TikTok. Adding this closes that gap
-- so the video-pipeline completion route can check "was this platform
-- already posted?" consistently across all four platforms, instead of
-- always re-attempting Instagram on every re-render (e.g. during a backfill
-- for a different missing platform).
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS instagram_posted_at timestamptz;
