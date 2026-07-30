-- Tracks whether a listing's auto-generated Reel has been posted to
-- TikTok, mirroring fb_posted_at/reel_posted_at/youtube_posted_at. Kept
-- separate since it's a distinct platform with its own independent
-- success/failure outcome.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS tiktok_posted_at timestamptz;
