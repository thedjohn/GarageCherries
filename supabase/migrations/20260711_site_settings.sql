-- Site-wide configurable settings: dealer/advertiser free-trial lengths and the
-- 250th-anniversary promo cutoff dates, previously hardcoded across several routes.
-- Single-row singleton table (id is always 1) editable from /admin (superadmin only).
-- Defaults below exactly match the previously-hardcoded values, so nothing changes
-- behaviorally until a superadmin edits a value via the admin panel.
create table if not exists site_settings (
  id int primary key default 1,
  promo_application_cutoff timestamptz not null default '2026-08-01T00:00:00Z',
  promo_expires_at timestamptz not null default '2026-10-31T23:59:59Z',
  advertiser_trial_days int not null default 14,
  dealer_default_trial_days int not null default 180,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint single_row check (id = 1)
);

insert into site_settings (id) values (1) on conflict (id) do nothing;

-- RLS: no public access at all — this table is only ever read/written via the
-- service-role client (createAdminClient()) from server-side API routes, which
-- bypasses RLS entirely. Enabling RLS with no policies just makes that explicit
-- and blocks any accidental anon/authenticated access if this table is ever
-- queried from a client-side Supabase call by mistake.
alter table site_settings enable row level security;
