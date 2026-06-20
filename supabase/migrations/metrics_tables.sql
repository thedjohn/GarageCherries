-- Listing views: one row per page view (deduped by ip_hash per day per listing)
create table if not exists listing_views (
  id          bigserial primary key,
  listing_id  text not null,
  dealer_id   text not null,
  ip_hash     text,
  viewed_at   timestamptz not null default now()
);

create index if not exists listing_views_dealer_id_idx on listing_views (dealer_id);
create index if not exists listing_views_listing_id_idx on listing_views (listing_id);
create index if not exists listing_views_viewed_at_idx on listing_views (viewed_at);

-- Inquiries: stored when buyer submits contact form
create table if not exists inquiries (
  id           bigserial primary key,
  listing_id   text not null,
  dealer_id    text not null,
  buyer_name   text not null,
  buyer_email  text not null,
  buyer_phone  text,
  message      text not null,
  created_at   timestamptz not null default now(),
  read         boolean not null default false
);

create index if not exists inquiries_dealer_id_idx on inquiries (dealer_id);
create index if not exists inquiries_listing_id_idx on inquiries (listing_id);
create index if not exists inquiries_created_at_idx on inquiries (created_at);

-- RLS: dealers can only see their own data
alter table listing_views enable row level security;
alter table inquiries enable row level security;

-- Service role bypasses RLS (used in API routes)
-- Anon/authenticated users cannot read these tables directly
create policy "service role only" on listing_views for all using (false);
create policy "service role only" on inquiries for all using (false);
