-- Weekly "Shows Near You" email: a subscriber gives an email + ZIP, we
-- resolve the ZIP to a state at signup time (via the zipcodes-us package
-- already used elsewhere for event search), and a Thursday cron job emails
-- them that weekend's approved car shows in their state.
-- Separate table from newsletter_subscribers -- that one has no location
-- field and covers general listings/market news, not location-targeted
-- event alerts.
-- email is always stored lowercased by the app before insert (same
-- convention as newsletter_subscribers), so a plain unique constraint on the
-- column works for upsert's ON CONFLICT and needs no functional index.
create table if not exists event_alert_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  zip             text,
  state           text not null,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists event_alert_subscribers_state_idx
  on event_alert_subscribers (state) where unsubscribed_at is null;

-- Same access model as newsletter_subscribers: all reads/writes go through
-- server routes using the service role key, never the public anon key
-- directly, so no public RLS policy is needed here.
alter table event_alert_subscribers enable row level security;
create policy "event_alert_subscribers_service_only" on event_alert_subscribers for all using (auth.role() = 'service_role');
