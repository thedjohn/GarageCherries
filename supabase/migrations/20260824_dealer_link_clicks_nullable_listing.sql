-- Dealer-profile and dealer-directory page clicks aren't tied to any one
-- listing, unlike the original listing-detail-page clicks this table was
-- built for.
alter table dealer_link_clicks alter column listing_id drop not null;
