-- Optional street address, ZIP, and photo for events -- street/zip feed the
-- Google Maps embed on the event detail page (same free iframe-embed pattern
-- already used on dealer pages), and image is shown on event cards/detail.
alter table events
  add column if not exists street text,
  add column if not exists zip text,
  add column if not exists image text;
