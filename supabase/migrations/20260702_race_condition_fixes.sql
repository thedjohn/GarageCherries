-- Close two check-then-insert race conditions: max 10 saved searches per
-- user, and max 10 active listings per private seller. Both previously
-- relied on an app-level SELECT count() followed by an INSERT, which two
-- concurrent requests could both pass. Run this in the Supabase SQL editor
-- (Dashboard > SQL Editor).
--
-- Technique: a transaction-scoped advisory lock keyed by the row owner
-- (pg_advisory_xact_lock) serializes concurrent attempts for the *same*
-- user/seller only (different users never block each other), and
-- auto-releases at commit/rollback. The count is re-checked after
-- acquiring the lock, so the second of two concurrent requests always
-- sees the first one's committed insert.

-- 1. Saved search alerts — unconditional max 10 per user, enforced via trigger.
CREATE OR REPLACE FUNCTION enforce_max_saved_searches()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text)::bigint);

  SELECT count(*) INTO v_count
    FROM saved_searches
    WHERE user_id = NEW.user_id;

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'ALERT_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_saved_searches ON saved_searches;
CREATE TRIGGER trg_enforce_max_saved_searches
  BEFORE INSERT ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_saved_searches();

-- 2. Listings — max 10 active (pending/approved) per private seller, but
-- dealers are exempt and the app can bypass entirely via BETA_MODE. Those
-- exemptions are decided in app code (dealer status is already looked up
-- there; BETA_MODE is a deploy-time env var the DB can't see), so instead
-- of a blanket trigger, this is an RPC the app calls with an explicit
-- p_enforce_limit flag — the count-check-and-insert itself is atomic,
-- while the *whether to check at all* decision stays where it already is.
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
  p_enforce_limit boolean
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
    status, seller_id
  ) VALUES (
    p_id, p_slug, p_title, p_year, p_make, p_model, p_price, p_mileage,
    p_location, p_state, p_condition, p_body_style, p_transmission,
    p_engine, p_color, p_images, p_description, p_seller_name,
    p_seller_phone, p_seller_email, p_vin, p_vin_verified, p_featured,
    p_status, p_seller_id
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_listing_with_limit TO service_role;
