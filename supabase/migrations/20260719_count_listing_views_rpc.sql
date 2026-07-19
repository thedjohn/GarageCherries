-- Aggregates listing_views counts in the database via GROUP BY, instead of
-- fetching raw rows into JS and counting client-side. Supabase/PostgREST caps
-- any unbounded .select() at 1000 rows by default, which was silently
-- undercounting views for /api/admin/watcher-counts and /api/dealer/watcher-counts
-- once a batch of listings' combined view rows crossed that threshold.
-- Confirmed live: a query for 13 listings' combined views returned exactly
-- 1000 rows via the old approach, but the true total (count: 'exact') was 1293.
create or replace function count_listing_views(p_listing_ids text[])
returns table(listing_id text, view_count bigint)
language sql
stable
as $$
  select listing_id, count(*) as view_count
  from listing_views
  where listing_id = any(p_listing_ids)
  group by listing_id;
$$;
