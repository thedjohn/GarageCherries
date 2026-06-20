-- Watchlist: authenticated users save cars to track price changes
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS watchlists (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id       text        NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  price_at_add integer     NOT NULL DEFAULT 0,
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, car_id)
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Each user can only read and modify their own watchlist entries
CREATE POLICY "Users manage own watchlist" ON watchlists
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
