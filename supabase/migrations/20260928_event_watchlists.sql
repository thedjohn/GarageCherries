-- Event watchlist: authenticated users save events to their account
-- Mirrors the car watchlists table/policy shape (see buyer_watchlist.sql)
-- Run this in the Supabase SQL editor

CREATE TABLE event_watchlists (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  event_id   uuid        NOT NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

ALTER TABLE event_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own event watchlist" ON event_watchlists
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
