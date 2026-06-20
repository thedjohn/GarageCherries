-- GarageCherries Database Schema
-- Run this in your Supabase project's SQL editor

-- ─────────────────────────────────────────
-- DEALERS
-- ─────────────────────────────────────────
create table if not exists dealers (
  id          text primary key,           -- e.g. 'u13'
  slug        text not null unique,       -- e.g. 'fastlane-cars'
  name        text not null,
  phone       text,
  email       text,
  location    text,
  state       text,
  description text,
  specialties text[],
  since       integer,
  logo        text,                       -- path like '/dealers/fastlane-logo.svg'
  website     text,
  created_at  timestamptz default now()
);

alter table dealers enable row level security;

-- Anyone can read dealers
create policy "Public dealers read" on dealers
  for select using (true);

-- Only authenticated dealer can update their own row
create policy "Dealer can update own row" on dealers
  for update using (auth.uid()::text = id);

-- ─────────────────────────────────────────
-- CARS
-- ─────────────────────────────────────────
create table if not exists cars (
  id                  text primary key,
  slug                text not null unique,
  title               text not null,
  year                integer not null,
  make                text not null,
  model               text not null,
  price               integer not null default 0,
  mileage             integer not null default 0,
  location            text,
  state               text,
  condition           text check (condition in ('Excellent','Good','Fair','Project')),
  body_style          text,
  transmission        text check (transmission in ('Automatic','Manual')),
  engine              text,
  color               text,
  interior_color      text,
  seat_material       text,
  seating_type        text,
  rear_wheel_spec     text,
  doors               integer,
  images              text[],
  options             text[],
  description         text,
  description_paragraphs text[],
  headline            text,
  hobby_segment       text,
  lot_number          text,
  seller_id           text references dealers(id) on delete set null,
  seller_name         text,
  seller_phone        text,
  featured            boolean default false,
  listed_at           text,
  created_at          timestamptz default now()
);

alter table cars enable row level security;

-- Anyone can read cars
create policy "Public cars read" on cars
  for select using (true);

-- Dealers can insert/update/delete their own cars
create policy "Dealer manages own cars" on cars
  for all using (auth.uid()::text = seller_id);

-- ─────────────────────────────────────────
-- INQUIRIES
-- ─────────────────────────────────────────
create table if not exists inquiries (
  id          uuid primary key default gen_random_uuid(),
  car_id      text references cars(id) on delete set null,
  dealer_id   text references dealers(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  message     text,
  type        text default 'Message',   -- 'Message' | 'Call' | 'Saved'
  read        boolean default false,
  created_at  timestamptz default now()
);

alter table inquiries enable row level security;

-- Buyers can insert inquiries
create policy "Anyone can submit inquiry" on inquiries
  for insert with check (true);

-- Dealers can read inquiries sent to them
create policy "Dealer reads own inquiries" on inquiries
  for select using (auth.uid()::text = dealer_id);

-- ─────────────────────────────────────────
-- USEFUL VIEWS
-- ─────────────────────────────────────────
create or replace view dealer_stats as
select
  d.id,
  d.name,
  count(c.id)              as listing_count,
  count(i.id)              as inquiry_count_30d
from dealers d
left join cars c on c.seller_id = d.id
left join inquiries i on i.dealer_id = d.id
  and i.created_at > now() - interval '30 days'
group by d.id, d.name;
