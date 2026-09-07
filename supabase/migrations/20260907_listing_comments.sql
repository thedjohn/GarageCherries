-- Public Q&A comments on vehicle listings. Additive only -- no changes to any
-- existing table. Buyers post top-level questions; only the listing's seller
-- (or a dealer_members team member) can reply -- Q&A style, not an open forum,
-- so replies always require is_seller = true and point at the top-level
-- comment (flat one-level reply model, no infinite threading).
-- listings.id is text (not uuid -- it also holds non-UUID string ids for
-- feed-synced listings), confirmed live when the first draft of this
-- migration failed with "foreign key constraint cannot be implemented:
-- uuid and text", so listing_id here is text to match.
create table listing_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references listings(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  is_seller boolean not null default false,
  body text not null,
  parent_id uuid references listing_comments(id) on delete cascade,
  seller_notified boolean not null default false,
  reported boolean not null default false,
  created_at timestamptz not null default now()
);

alter table listing_comments enable row level security;

-- Anyone can read -- same "public UGC" rule dealer_reviews already uses.
create policy "listing_comments_public_read" on listing_comments
  for select using (true);

-- seller_id is uuid on listings but text on dealer_members.dealer_id (same
-- cast issue hit and fixed once already for this project), so both
-- comparisons below cast to ::text.
create policy "listing_comments_insert_own" on listing_comments for insert with check (
  author_id = auth.uid()
  and (
    -- is_seller can only ever be true when the poster actually owns/manages this listing
    is_seller = false
    or exists (
      select 1 from listings l where l.id = listing_comments.listing_id
      and (l.seller_id::text = auth.uid()::text
           or l.seller_id::text in (select dealer_id from dealer_members where user_id = auth.uid()))
    )
  )
  and (
    -- Buyers can only post top-level questions (parent_id null); replies
    -- (parent_id set) require is_seller = true, which the block above
    -- already restricts to real sellers/team members.
    parent_id is null or is_seller = true
  )
);

-- Delete: the comment's own author, or the listing's seller/team, can remove it.
create policy "listing_comments_delete_own_or_seller" on listing_comments for delete using (
  author_id = auth.uid()
  or exists (
    select 1 from listings l where l.id = listing_comments.listing_id
    and (l.seller_id::text = auth.uid()::text
         or l.seller_id::text in (select dealer_id from dealer_members where user_id = auth.uid()))
  )
);

create index listing_comments_listing_id_idx on listing_comments(listing_id);
create index listing_comments_parent_id_idx on listing_comments(parent_id);
