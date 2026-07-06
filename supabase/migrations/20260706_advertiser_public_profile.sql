-- Add public profile fields to advertisers table
ALTER TABLE advertisers
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS website text DEFAULT NULL;

-- Back-fill slugs for any existing advertisers from business_name
UPDATE advertisers
SET slug = LOWER(REGEXP_REPLACE(business_name, '[^a-z0-9]+', '-', 'gi')) || '-' || SUBSTRING(id::text, 1, 6)
WHERE slug IS NULL;
