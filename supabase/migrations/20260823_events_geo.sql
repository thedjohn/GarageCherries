-- Nullable approximate coordinates for real distance-based event search
-- (replacing state-bucket-only ZIP matching). Resolved from location+state
-- via a static city/ZIP dataset at write time, or a whole-state fallback
-- when the free-text location doesn't match a known city -- see lib/geo.ts.
alter table events
  add column if not exists lat double precision,
  add column if not exists lng double precision;
