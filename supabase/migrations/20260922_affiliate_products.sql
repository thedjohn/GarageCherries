-- Affiliate product catalog for /garage-gear and the on-site tool cards.
-- Replaces the hardcoded TOOLS/LINKS arrays in components/ShopToolsCard.tsx
-- and app/links/page.tsx with an admin-manageable table.
create table if not exists affiliate_products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  image_url      text,
  description    text not null default '',
  category       text not null,
  merchant       text not null,
  affiliate_url  text not null,
  regular_url    text,
  price          numeric,
  featured       boolean not null default false,
  display_order  integer not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create index if not exists affiliate_products_active_order_idx
  on affiliate_products (active, category, display_order);

-- Public read (same pattern as events)
alter table affiliate_products enable row level security;
create policy "affiliate_products_public_read" on affiliate_products for select using (active = true);
create policy "affiliate_products_service_write" on affiliate_products for all using (auth.role() = 'service_role');
