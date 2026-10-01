-- Build Profile view tracking, mirroring listing_views exactly.
-- Run this in the Supabase SQL editor.

CREATE TABLE build_views (
  id         bigserial   PRIMARY KEY,
  build_id   uuid        NOT NULL,
  ip_hash    text,
  viewed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX build_views_build_id_idx ON build_views (build_id);
CREATE INDEX build_views_viewed_at_idx ON build_views (viewed_at);

ALTER TABLE build_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON build_views FOR ALL USING (false);
