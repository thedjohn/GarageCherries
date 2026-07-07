alter table events add column if not exists slug text;

-- Backfill slugs for existing events
update events
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || date
where slug is null;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_slug_unique'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_slug_unique UNIQUE (slug);
  END IF;
END$$;
