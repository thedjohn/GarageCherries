-- Adds an optional public "Build Profile" page per garage vehicle.
-- Run this in the Supabase SQL editor.

ALTER TABLE garage_vehicles
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN slug text UNIQUE;

-- The existing "Users manage own garage vehicles" policy only covers the
-- owner's own read/write access -- it would otherwise block the public
-- /build/[slug] page entirely, since that page reads as an anonymous visitor.
CREATE POLICY "Public can read public garage vehicles" ON garage_vehicles
  FOR SELECT
  USING (is_public = true);
