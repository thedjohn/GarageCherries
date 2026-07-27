-- Tracks when a listing had a branded video posted as a Facebook/Instagram
-- Reel, separately from fb_posted_at (the existing photo post). Runs
-- alongside the photo post, not instead of it -- this column just prevents
-- posting the same listing's video twice.
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor).

ALTER TABLE listings ADD COLUMN IF NOT EXISTS reel_posted_at timestamptz;
