-- Public, anonymous "like" on a Build Profile -- same IP-hash approach as
-- build_views, but one row per (build, visitor) so it can be toggled.
-- Run this in the Supabase SQL editor.

CREATE TABLE build_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id   uuid        NOT NULL,
  ip_hash    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (build_id, ip_hash)
);

CREATE INDEX build_likes_build_id_idx ON build_likes (build_id);

ALTER TABLE build_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON build_likes FOR ALL USING (false);
