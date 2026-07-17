-- Tracks when a listing was last posted to the Facebook Page, so the admin
-- "Repost to Facebook" action can warn before creating a duplicate post.
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor).

ALTER TABLE listings ADD COLUMN IF NOT EXISTS fb_posted_at timestamptz;
