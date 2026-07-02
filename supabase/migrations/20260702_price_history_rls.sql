-- M10: Enable RLS on price_history table
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Sellers can read price history for their own listings
CREATE POLICY "price_history_seller_read"
  ON price_history
  FOR SELECT
  USING (
    car_id IN (
      SELECT id FROM listings WHERE seller_id = auth.uid()
    )
  );

-- Service role (admin client) bypasses RLS — no INSERT policy needed
-- for app code since all writes go through createAdminClient().
-- If you ever need to let buyers see price history for approved listings:
-- CREATE POLICY "price_history_public_read"
--   ON price_history FOR SELECT
--   USING (car_id IN (SELECT id FROM listings WHERE status = 'approved'));
