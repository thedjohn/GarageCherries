-- Phase 5 of the Instagram monetization plan: "GarageCherry of the Day".
-- References an existing listing rather than duplicating vehicle data
-- (year/make/model/price/images/dealer all already live on `listings`) --
-- this table only holds the editorial content specific to featuring it.
create table if not exists garagecherry_of_the_day (
  id                     uuid primary key default gen_random_uuid(),
  -- listings.id is text, not uuid (feed-synced listings mint their own id
  -- via crypto.randomUUID() and store it as a string) -- matched here so the
  -- FK constraint can actually be created.
  listing_id             text not null references listings(id),
  featured_date          date not null unique,
  short_description      text,
  interesting_facts      text,
  instagram_caption      text,
  instagram_reel_caption text,
  hashtags               text,
  created_at             timestamptz not null default now()
);

create index if not exists garagecherry_of_the_day_date_idx
  on garagecherry_of_the_day (featured_date desc);

-- Public read (same pattern as events/affiliate_products)
alter table garagecherry_of_the_day enable row level security;
create policy "garagecherry_of_the_day_public_read" on garagecherry_of_the_day for select using (true);
create policy "garagecherry_of_the_day_service_write" on garagecherry_of_the_day for all using (auth.role() = 'service_role');
