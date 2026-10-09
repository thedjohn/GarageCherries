-- Short, human-typeable listing codes (shown as "GC-XXXXX") for YouTube Shorts:
-- viewers can't click links in Shorts, so the video/description tell them to
-- search the code on garagecherries.com or visit garagecherries.com/c/<code>.
--
-- Stored (not derived from the listing id) so uniqueness can be guaranteed:
-- 5 characters from a 31-character alphabet is ~28.6M combinations, but a
-- hash-derived code across thousands of listings has a real birthday-collision
-- chance. Alphabet drops the ambiguous 0/O, 1/I/L.
--
-- youtube_blocked_reason: set by /api/video-pipeline/complete when the
-- pre-upload checks (lib/youtube/postShort.ts validateYouTubeUpload) block a
-- YouTube upload, so the hourly backfill stops re-rendering that listing every
-- day just to be blocked again. Clear it (set to null) after fixing the
-- listing to let the backfill retry.

alter table listings add column if not exists listing_code text;
alter table listings add column if not exists youtube_blocked_reason text;

create or replace function generate_listing_code() returns text
language plpgsql as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..5 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from listings where listing_code = code);
  end loop;
  return code;
end $$;

-- Every insert path (seller form, admin, dealer feed RPC) gets a code
-- automatically, without touching each insert call site.
create or replace function set_listing_code() returns trigger
language plpgsql as $$
begin
  if new.listing_code is null then
    new.listing_code := generate_listing_code();
  end if;
  return new;
end $$;

drop trigger if exists listings_set_listing_code on listings;
create trigger listings_set_listing_code
  before insert on listings
  for each row execute function set_listing_code();

-- Backfill existing listings one row at a time, so each new code's
-- uniqueness check sees the codes assigned before it.
do $$
declare r record;
begin
  for r in select id from listings where listing_code is null loop
    update listings set listing_code = generate_listing_code() where id = r.id;
  end loop;
end $$;

create unique index if not exists listings_listing_code_key on listings (listing_code);
