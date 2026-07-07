'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Supabase sessions are stateless JWTs -- deleting a user server-side (e.g. an
// admin removing an account) doesn't revoke an already-issued access token, so
// the browser can keep "looking" logged in for up to its lifetime even though
// the account is gone and every real request will fail. This patches fetch
// once, app-wide, to catch that: if a same-origin /api/ call comes back 401
// while the browser still believes it has a session, that mismatch means the
// account no longer exists (or was suspended out from under the session) --
// force a clean sign-out instead of leaving a "logged in but can't do
// anything" zombie state.
export default function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    if ((window.fetch as { __sessionGuardPatched?: boolean }).__sessionGuardPatched) return;

    const supabase = createClient();
    const originalFetch = window.fetch.bind(window);

    const patchedFetch = (async (...args: Parameters<typeof window.fetch>) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        const input = args[0];
        const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const path = new URL(rawUrl, window.location.origin).pathname;

        if (path.startsWith('/api/')) {
          // getUser() (not getSession()) -- it round-trips to the Supabase Auth
          // server to confirm the session is genuinely still valid, rather than
          // trusting the local cache. A stray 401 can happen right after sign-in
          // from an unrelated timing race; only a server-confirmed invalid
          // session should trigger a forced logout.
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.auth.signOut();
            router.push('/account/login?reason=session_ended');
          }
        }
      }

      return response;
    }) as typeof window.fetch & { __sessionGuardPatched?: boolean };
    patchedFetch.__sessionGuardPatched = true;

    window.fetch = patchedFetch;
    return () => { window.fetch = originalFetch; };
  }, [router]);

  return null;
}
