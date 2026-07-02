-- Enforce one review per user per dealer at the DB level.
-- The app already checks this before insert (app/api/reviews/route.ts), but that
-- check-then-insert can race under concurrent requests. Run this in the Supabase
-- SQL editor (Dashboard > SQL Editor).

ALTER TABLE dealer_reviews
  ADD CONSTRAINT dealer_reviews_dealer_id_reviewer_id_key UNIQUE (dealer_id, reviewer_id);
