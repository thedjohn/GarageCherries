-- saved_searches: buyer car alerts
CREATE TABLE IF NOT EXISTS saved_searches (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text,
  make             text,
  model            text,
  year_min         integer,
  year_max         integer,
  price_max        integer,
  mileage_max      integer,
  condition        text[],
  body_style       text,
  transmission     text,
  state            text,
  active           boolean NOT NULL DEFAULT true,
  paused           boolean NOT NULL DEFAULT false,
  last_emailed_at  timestamptz,
  last_matched_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS saved_searches_active_idx  ON saved_searches(active, paused);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own searches" ON saved_searches;
CREATE POLICY "Users manage own searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- alert_matches: tracks which cars have already triggered a given alert
CREATE TABLE IF NOT EXISTS alert_matches (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id   uuid NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  car_id            text NOT NULL,
  match_score       numeric(4,3),
  emailed_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saved_search_id, car_id)
);

CREATE INDEX IF NOT EXISTS alert_matches_search_idx ON alert_matches(saved_search_id);

ALTER TABLE alert_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only on alert_matches" ON alert_matches;
CREATE POLICY "Service role only on alert_matches" ON alert_matches
  FOR ALL USING (auth.role() = 'service_role');
