import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

// This route is shared infrastructure: it's used both by dealer password-reset
// links (PKCE recovery flow) and by Google/Facebook sign-in. The profiles seeding
// below only applies to the latter -- gated on app_metadata.provider so a dealer
// resetting their password never gets a stray profiles row created.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const promo = searchParams.get('promo');
  const pendingSaveCarId = searchParams.get('save');
  const pendingSavePrice = searchParams.get('price');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()      { return cookieStore.getAll(); },
          setAll(toSet) { try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
        },
      }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user && ['google', 'facebook'].includes(data.user.app_metadata?.provider ?? '')) {
        const admin = createAdminClient();
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const fullName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? '';
          const promoExpiresAt = promo ? '2026-12-31T23:59:59Z' : null;
          await admin.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            updated_at: new Date().toISOString(),
            ...(promoExpiresAt && { promo_expires_at: promoExpiresAt }),
          });
        }
      }

      // Complete a save-without-account car save right here, server-side, in
      // the same request that creates the session -- doing this as a
      // follow-up client-side step (after redirecting) meant the save could
      // be cut off if the person navigated away before it finished. Doing it
      // here removes that race entirely.
      let saved = false;
      if (data.user && pendingSaveCarId) {
        const { data: existing, error: selectErr } = await supabase
          .from('watchlists').select('id').eq('user_id', data.user.id).eq('car_id', pendingSaveCarId).maybeSingle();
        if (selectErr) {
          console.error('Pending-save watchlist lookup failed:', selectErr.message, selectErr.details, selectErr.hint);
        } else if (!existing) {
          const { error: insertErr } = await supabase.from('watchlists').insert({
            user_id:              data.user.id,
            car_id:                pendingSaveCarId,
            price_at_add:          pendingSavePrice ? Number(pendingSavePrice) : 0,
            allow_dealer_contact:  true,
          });
          if (insertErr) {
            console.error('Pending-save watchlist insert failed:', insertErr.message, insertErr.details, insertErr.hint);
          } else {
            saved = true;
          }
        } else {
          saved = true; // already watching this car
        }
      }

      const dest = new URL(next, req.url);
      if (saved) dest.searchParams.set('saved', '1');
      return NextResponse.redirect(dest);
    }
  }

  // Code missing or exchange failed — send to homepage
  return NextResponse.redirect(new URL('/', req.url));
}
