-- handle_new_user_profile() had its own hardcoded 2026-10-31 promo expiry,
-- separate from app/auth/callback/route.ts (already updated to 2026-12-31
-- for Google/Facebook signups). Email/password signups with ?promo=250th
-- were still getting the old date. Run this in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Only email/password signups: Google/Facebook already seed profiles
  -- via app/auth/callback/route.ts, which also applies promo params
  -- from the OAuth redirect URL — this trigger must not race that.
  if coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email' then
    insert into public.profiles (id, full_name, updated_at, promo_expires_at)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      now(),
      case when coalesce(new.raw_user_meta_data->>'promo', '') <> ''
           then '2026-12-31 23:59:59+00'::timestamptz
           else null end
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$function$
