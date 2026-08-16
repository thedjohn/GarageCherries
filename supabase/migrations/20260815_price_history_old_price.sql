-- The app has always tried to record `old_price` on every price_history
-- insert (see app/api/listings/[id]/route.ts and the dealer dashboard's
-- own listing-edit save), but this column was never actually created --
-- every one of those inserts has been silently failing since price_history
-- was introduced, leaving PriceHistoryChart with nothing to render and the
-- weekly price-drops digest always reporting no changes.
ALTER TABLE price_history
  ADD COLUMN IF NOT EXISTS old_price numeric;
