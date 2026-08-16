-- Supports refreshing a listing's social videos when its price drops after
-- the video was already posted (the price is burned into the video itself
-- and into each platform's title/description at post time, and nothing
-- previously ever revisited it). facebook_reel_id/instagram_media_id mirror
-- youtube_video_id (already existed) -- Facebook/Instagram's posting code
-- previously discarded these IDs, so there was nothing to reference to
-- clean up an old post before replacing it.
--
-- price_dropped_at is set by the existing price-drop detection when a
-- listing with a video gets cheaper, and is deliberately NEVER cleared --
-- staleness is determined per platform by comparing each platform's own
-- *_posted_at against price_dropped_at (posted before the drop = stale,
-- posted after = already caught up), so a platform that failed to refresh
-- keeps getting retried on its own without needlessly re-posting to
-- platforms that already succeeded. video_refresh_last_attempted_at is a
-- separate, unconditional "we tried a render for this listing" stamp used
-- only to debounce how often repeated price edits trigger a new render --
-- it does not track success and is not part of the staleness comparison.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS facebook_reel_id text,
  ADD COLUMN IF NOT EXISTS instagram_media_id text,
  ADD COLUMN IF NOT EXISTS price_dropped_at timestamptz,
  ADD COLUMN IF NOT EXISTS video_refresh_last_attempted_at timestamptz;
