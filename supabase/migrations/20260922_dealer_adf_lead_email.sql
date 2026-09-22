-- ADF/XML lead delivery to a dealer's own CRM (e.g. Salesforce's Email
-- Service inbox), alongside the existing HTML lead notification email.
-- Optional and off by default -- adf_lead_email is only set for a dealer
-- whose CRM has been confirmed to accept ADF leads by email (first:
-- Beverly Hills Car Club, per Joe Harwick 2026-09-22).
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS adf_lead_email text;
