-- Admin-curated "Featured Build" rotation for /showcase, mirroring the
-- existing garagecherry_of_the_day mechanism exactly.
-- Run this in the Supabase SQL editor.

CREATE TABLE featured_builds (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_vehicle_id uuid        NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
  featured_date     date        NOT NULL UNIQUE,
  blurb             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE featured_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read featured builds" ON featured_builds
  FOR SELECT USING (true);

CREATE POLICY "Service role manages featured builds" ON featured_builds
  FOR ALL USING (auth.role() = 'service_role');
