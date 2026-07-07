alter table events add column if not exists slug text;

-- Backfill slugs for existing events
update events
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || date
where slug is null;

alter table events add constraint if not exists events_slug_unique unique (slug);
