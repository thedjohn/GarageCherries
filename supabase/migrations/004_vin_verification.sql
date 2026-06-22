-- VIN verification fields on cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin            text;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin_verified   boolean NOT NULL DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin_make       text;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin_model      text;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin_year       integer;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS cars_vin_idx ON cars(vin);
