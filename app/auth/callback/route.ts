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
          const promoExpiresAt = promo ? '2026-10-31T23:59:59Z' : null;
          await admin.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            updated_at: new Date().toISOString(),
            ...(promoExpiresAt && { promo_expires_at: promoExpiresAt }),
          });
        }
      }

      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  // Code missing or exchange failed — send to homepage
  return NextResponse.redirect(new URL('/', req.url));
}
