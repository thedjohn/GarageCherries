-- Dealer link clicks: one row per "Visit website" / "Call Dealer" click on a listing
create table if not exists dealer_link_clicks (
  id           bigserial primary key,
  dealer_id    text not null,
  listing_id   text not null,
  click_type   text not null check (click_type in ('website', 'phone')),
  clicked_at   timestamptz not null default now()
);

create index if not exists dealer_link_clicks_dealer_id_idx on dealer_link_clicks (dealer_id);
create index if not exists dealer_link_clicks_listing_id_idx on dealer_link_clicks (listing_id);
create index if not exists dealer_link_clicks_clicked_at_idx on dealer_link_clicks (clicked_at);

-- RLS: service role only, same policy as listing_views/inquiries
alter table dealer_link_clicks enable row level security;
create policy "service role only" on dealer_link_clicks for all using (false);
