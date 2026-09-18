-- Tracks how many times facebook-post-queue has attempted to post a listing.
-- Used to cap retries so a listing that permanently fails to post (e.g. Facebook
-- rejecting an otherwise-valid image) stops generating a Sentry error every hour
-- forever and instead gets logged once as "gave up".
alter table listings add column fb_post_attempts integer not null default 0;
