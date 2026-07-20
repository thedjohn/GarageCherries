-- Same root cause as 20260719_count_listing_views_rpc.sql, applied to watchlists:
-- both watcher-counts routes fetched raw watchlists rows and aggregated in JS,
-- which Supabase/PostgREST caps at 1000 rows on any unbounded .select(). Not
-- confirmed to have actually undercounted in production yet (watchlist volume
-- is far lower than page views pre-launch), but it's the identical latent bug
-- shape, fixed proactively.
--
-- count_watchlists: plain per-listing watcher count, used by the admin route
-- (app/api/admin/watcher-counts/route.ts), which only ever needed a count.
create or replace function count_watchlists(p_listing_ids text[])
returns table(car_id text, watcher_count bigint)
language sql
stable
as $$
  select car_id, count(*) as watcher_count
  from watchlists
  where car_id = any(p_listing_ids)
  group by car_id;
$$;

-- count_dealer_watchers: the dealer route (app/api/dealer/watcher-counts/route.ts)
-- derives three fields from the same watchlists rows, not just a count — eligible
-- watchers for "Message watchers" (allow_dealer_contact, not blocked, not yet
-- messaged), whether any watcher has been messaged, and the total watcher count.
-- A plain count RPC isn't enough here: if the raw row fetch this replaces ever
-- hit the 1000-row cap, `counts`/`messaged` would silently go wrong too, not
-- just the displayed total. Aggregating all three server-side via GROUP BY
-- fixes all of them at once, regardless of row volume.
create or replace function count_dealer_watchers(p_listing_ids text[])
returns table(car_id text, total_watchers bigint, eligible_count bigint, messaged boolean)
language sql
stable
as $$
  select
    car_id,
    count(*) as total_watchers,
    count(*) filter (
      where allow_dealer_contact and not dealer_contact_blocked and dealer_messaged_at is null
    ) as eligible_count,
    bool_or(dealer_messaged_at is not null) as messaged
  from watchlists
  where car_id = any(p_listing_ids)
  group by car_id;
$$;
