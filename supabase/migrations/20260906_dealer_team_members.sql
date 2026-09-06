-- Dealer team access: lets a dealer (the "parent", dealers.id === auth.uid())
-- invite additional Supabase Auth users ("team members") who can act on the
-- same dealer account -- see app/api/dealer/team/route.ts and lib/dealerAuth.ts.
create table if not exists dealer_members (
  id           uuid primary key default gen_random_uuid(),
  dealer_id    text not null references dealers(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  invited_at   timestamptz not null default now(),
  unique (dealer_id, user_id)
);

create index if not exists dealer_members_dealer_id_idx on dealer_members (dealer_id);
create index if not exists dealer_members_user_id_idx on dealer_members (user_id);

alter table dealer_members enable row level security;

-- A member needs to read their own membership row client-side --
-- app/dealer/dashboard/page.tsx's loadData() runs on the anon-key client,
-- not through an API route. Writes only ever happen via the service-role
-- client in app/api/dealer/team/route.ts, so no INSERT/DELETE policy is
-- needed here (RLS defaults to deny, which is correct).
drop policy if exists "dealer_members_read_own" on dealer_members;
create policy "dealer_members_read_own" on dealer_members
  for select using (user_id = auth.uid());

-- Additive only: dealer_members is a brand new table, and Postgres OR's
-- multiple permissive policies for the same command together, so these
-- three can't touch or break whatever the live SELECT/INSERT/UPDATE
-- policies on `listings` already say. Needed because the dealer dashboard
-- reads AND writes `listings` directly on the anon-key client (loadData(),
-- add-vehicle, edit-vehicle, price-drop) rather than through an
-- admin-client API route like most other dealer actions.
drop policy if exists "dealer_members_read_dealer_listings" on listings;
create policy "dealer_members_read_dealer_listings" on listings
  for select using (
    seller_id::text in (select dealer_id from dealer_members where user_id = auth.uid())
  );

drop policy if exists "dealer_members_insert_dealer_listings" on listings;
create policy "dealer_members_insert_dealer_listings" on listings
  for insert with check (
    seller_id::text in (select dealer_id from dealer_members where user_id = auth.uid())
  );

drop policy if exists "dealer_members_update_dealer_listings" on listings;
create policy "dealer_members_update_dealer_listings" on listings
  for update using (
    seller_id::text in (select dealer_id from dealer_members where user_id = auth.uid())
  );
