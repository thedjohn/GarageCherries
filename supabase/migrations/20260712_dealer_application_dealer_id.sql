-- Links each dealer_applications row to the exact dealers row it created,
-- instead of matching by email only (which breaks if an account is deleted
-- and a later application reuses the same email).
alter table dealer_applications add column if not exists dealer_id text references dealers(id) on delete set null;

-- Backfill existing approved applications: for each email, only link the
-- most recently reviewed application, since that's the one most likely to
-- have created the dealer account that currently exists with that email.
-- Older duplicate applications for the same email are left unlinked
-- (dealer_id stays null) rather than guessed at.
with ranked as (
  select id, email,
         row_number() over (partition by email order by reviewed_at desc) as rn
  from dealer_applications
  where status = 'approved'
)
update dealer_applications da
set dealer_id = d.id
from dealers d, ranked r
where da.id = r.id and r.rn = 1 and d.email = da.email;
