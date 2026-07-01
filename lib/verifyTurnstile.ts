/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * Setup:
 *   1. Go to https://dash.cloudflare.com → Turnstile → Add site
 *   2. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to your .env.local (public, for the widget)
 *   3. Add TURNSTILE_SECRET_KEY to your .env.local (secret, never expose to client)
 *
 * If TURNSTILE_SECRET_KEY is not set (e.g. local dev without keys), verification is skipped.
 */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Skip verification in dev if keys aren't configured yet
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification');
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
