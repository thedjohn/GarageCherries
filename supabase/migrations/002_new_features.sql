-- ============================================================
-- Migration 002: New feature tables + column additions
-- Run this in the Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add user_id to listing_views (for personalized email digests)
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS listing_views_user_id_idx ON listing_views(user_id, viewed_at DESC);

-- 2. Price history (tracks price changes on listings)
CREATE TABLE IF NOT EXISTS price_history (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id     text NOT NULL,
  price      numeric NOT NULL,
  changed_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_history_car_id_idx ON price_history(car_id, changed_at ASC);
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can read price history" ON price_history;
CREATE POLICY "anyone can read price history" ON price_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "service role can insert price history" ON price_history;
CREATE POLICY "service role can insert price history" ON price_history FOR INSERT WITH CHECK (true);

-- 3. Buyer offers
CREATE TABLE IF NOT EXISTS offers (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id      text NOT NULL,
  car_title   text NOT NULL,
  buyer_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text NOT NULL,
  buyer_name  text,
  amount      numeric NOT NULL,
  message     text,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','countered')),
  dealer_id   text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offers_car_id_idx    ON offers(car_id, created_at DESC);
CREATE INDEX IF NOT EXISTS offers_dealer_id_idx ON offers(dealer_id, created_at DESC);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyers can manage own offers" ON offers;
CREATE POLICY "buyers can manage own offers" ON offers FOR ALL USING (buyer_id = auth.uid());
DROP POLICY IF EXISTS "dealers can read offers their cars" ON offers;
CREATE POLICY "dealers can read offers their cars" ON offers FOR SELECT USING (dealer_id = auth.uid()::text);

-- 4. Dealer reviews
CREATE TABLE IF NOT EXISTS dealer_reviews (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id      text NOT NULL,
  reviewer_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name  text,
  rating         integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review         text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dealer_reviews_dealer_id_idx ON dealer_reviews(dealer_id, created_at DESC);
ALTER TABLE dealer_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can read reviews" ON dealer_reviews;
CREATE POLICY "anyone can read reviews" ON dealer_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "buyers can write reviews" ON dealer_reviews;
CREATE POLICY "buyers can write reviews" ON dealer_reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "buyers can delete own reviews" ON dealer_reviews;
CREATE POLICY "buyers can delete own reviews" ON dealer_reviews FOR DELETE USING (reviewer_id = auth.uid());

-- 5. Sold tracking on cars
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_sold    boolean    DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS sold_at    timestamptz;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS sold_price numeric;

-- 6. Dealer badge tier
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS badge_tier text DEFAULT 'none';

-- 7. Atomic increment helper for price_history (used by serve route pattern)
CREATE OR REPLACE FUNCTION record_price_change(p_car_id text, p_price numeric)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO price_history(car_id, price) VALUES (p_car_id, p_price);
$$;
