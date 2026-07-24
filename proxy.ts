import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()        { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh auth session
  const { data: { user } } = await supabase.auth.getUser();

  // Protect dealer routes
  if (request.nextUrl.pathname.startsWith('/dealer/') &&
      !request.nextUrl.pathname.startsWith('/dealer/login') &&
      !request.nextUrl.pathname.startsWith('/dealer/apply')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dealer/login';
      return NextResponse.redirect(url);
    }
  }

  // Deliberately no "already authenticated -> redirect away from /dealer/login"
  // here: recovery-link tokens (#access_token=...) arrive as a URL hash, which
  // is never sent to the server, so this middleware can't tell a recovery
  // link apart from a normal visit -- redirecting on any existing session
  // silently discarded the new token and used whatever session was already in
  // the browser instead, which is what broke the dealer password-reset flow
  // for anyone who wasn't in a fully signed-out browser (2026-07-24).

  return supabaseResponse;
}

export const config = {
  matcher: ['/dealer/:path*'],
};
