-- Events table for the /events car show calendar
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  date        date not null,
  end_date    date,
  location    text not null,
  state       text not null,
  type        text not null check (type in ('show', 'swap-meet', 'cruise', 'auction')),
  description text not null default '',
  url         text,
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Public read
alter table events enable row level security;
create policy "events_public_read" on events for select using (true);
create policy "events_service_write" on events for all using (auth.role() = 'service_role');
