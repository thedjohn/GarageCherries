-- Add drive_type support to the private-seller listing insert RPC.
-- The listings table already has a drive_type column (used by dealer/admin
-- direct inserts) but insert_listing_with_limit() never accepted or wrote
-- it, so /sell submissions always got a null drive_type even if collected.
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor).
--
-- NOTE: adding a trailing parameter makes Postgres treat this as a new
-- overload rather than a replacement of the old 26-arg function, so the
-- old signature must be dropped explicitly first, or GRANT/calls become
-- ambiguous between the two versions.

DROP FUNCTION IF EXISTS insert_listing_with_limit(
  text, text, text, integer, text, text, integer, integer, text, text,
  text, text, text, text, text, text[], text, text, text, text,
  text, boolean, boolean, text, uuid, boolean
);

CREATE OR REPLACE FUNCTION insert_listing_with_limit(
  p_id text,
  p_slug text,
  p_title text,
  p_year integer,
  p_make text,
  p_model text,
  p_price integer,
  p_mileage integer,
  p_location text,
  p_state text,
  p_condition text,
  p_body_style text,
  p_transmission text,
  p_engine text,
  p_color text,
  p_images text[],
  p_description text,
  p_seller_name text,
  p_seller_phone text,
  p_seller_email text,
  p_vin text,
  p_vin_verified boolean,
  p_featured boolean,
  p_status text,
  p_seller_id uuid,
  p_enforce_limit boolean,
  p_drive_type text DEFAULT NULL
)
RETURNS listings
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_row listings;
BEGIN
  IF p_enforce_limit AND p_seller_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_seller_id::text)::bigint);

    SELECT count(*) INTO v_count
      FROM listings
      WHERE seller_id = p_seller_id
        AND status IN ('pending', 'approved');

    IF v_count >= 10 THEN
      RAISE EXCEPTION 'LISTING_LIMIT' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO listings (
    id, slug, title, year, make, model, price, mileage, location, state,
    condition, body_style, transmission, engine, color, images, description,
    seller_name, seller_phone, seller_email, vin, vin_verified, featured,
    status, seller_id, drive_type
  ) VALUES (
    p_id, p_slug, p_title, p_year, p_make, p_model, p_price, p_mileage,
    p_location, p_state, p_condition, p_body_style, p_transmission,
    p_engine, p_color, p_images, p_description, p_seller_name,
    p_seller_phone, p_seller_email, p_vin, p_vin_verified, p_featured,
    p_status, p_seller_id, p_drive_type
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_listing_with_limit TO service_role;
