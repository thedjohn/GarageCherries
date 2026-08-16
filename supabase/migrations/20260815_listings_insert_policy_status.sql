-- The existing "Dealers and sellers can insert own listings" INSERT policy
-- only checked (seller_id = auth.uid()) -- it never restricted `status`, so
-- nothing at the database level stopped a private seller from bypassing the
-- app's own /api/listings/submit route (which always inserts status:
-- 'pending' for non-dealers) and inserting a listing directly as
-- status: 'approved', skipping admin review entirely. This codifies what
-- the app already intends: only a dealer account may insert a listing with
-- status 'approved'; everyone else must insert as 'pending' (or any other
-- non-'approved' status).
ALTER POLICY "Dealers and sellers can insert own listings" ON listings
  WITH CHECK (
    seller_id = auth.uid()
    AND (status <> 'approved' OR EXISTS (SELECT 1 FROM dealers WHERE id = auth.uid()::text))
  );
