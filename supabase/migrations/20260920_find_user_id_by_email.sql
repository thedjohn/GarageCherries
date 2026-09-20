-- Looks up one account's id by email directly, so the team-invite and admin
-- team routes don't have to page through the whole user list (auth.admin.listUsers()
-- with no arguments returns only the first 50 accounts).
--
-- security definer lets it read auth.users, which the API roles cannot. It is
-- therefore locked down below: only the server-side service role may call it.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
