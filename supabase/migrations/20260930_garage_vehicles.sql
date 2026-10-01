-- My Garage: vehicles a user actually owns (not for sale), with photos and a mod list.
-- Run this in the Supabase SQL editor, then manually create a public-read "garage-images"
-- storage bucket (Storage > New bucket), same as listing-images/dealer-logos/inspection-reports.

CREATE TABLE garage_vehicles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  year        integer     NOT NULL,
  make        text        NOT NULL,
  model       text        NOT NULL,
  trim        text,
  nickname    text,
  mileage     integer,
  notes       text,
  images      text[]      NOT NULL DEFAULT '{}',
  mods        jsonb       NOT NULL DEFAULT '[]', -- [{ description: string, installed_at?: string }]
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE garage_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own garage vehicles" ON garage_vehicles
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
