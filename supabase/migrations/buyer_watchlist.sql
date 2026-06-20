-- Watchlist: authenticated users save cars to track price changes
-- Run this in the Supabase SQL editor

CREATE TABLE watchlists (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL,
  car_id       text        NOT NULL,
  price_at_add integer     NOT NULL DEFAULT 0,
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, car_id)
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watchlist" ON watchlists
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
