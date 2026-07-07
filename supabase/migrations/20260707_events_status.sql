-- Add status + submitter fields to events table
alter table events
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists submitter_email text,
  add column if not exists submitter_name text;

-- All previously-created events were admin-created; mark them approved
update events set status = 'approved' where status = 'pending';

-- Public only sees approved events (replaces the unrestricted read policy)
drop policy if exists "events_public_read" on events;
create policy "events_public_read" on events for select using (status = 'approved');
