'use client';

// Client-only GA4 helpers. gtag.js itself only loads on the real production
// deployment (see app/layout.tsx's VERCEL_ENV gate), so every call here is a
// safe no-op anywhere else (local dev, preview deployments, tests) rather
// than throwing on a missing window.gtag.

const FIRST_TOUCH_COOKIE = 'gc_first_touch';
const FIRST_TOUCH_MAX_AGE_DAYS = 30;

interface FirstTouch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}; SameSite=Lax`;
}

// Captures utm_source/utm_medium/utm_campaign/utm_content from the current
// URL as first-touch attribution -- only writes once per visitor (a later
// visit from a different link doesn't overwrite which campaign originally
// brought them), same first-touch model most marketing attribution uses.
// Call once on initial page load (see components/UtmCapture.tsx).
export function captureFirstTouch() {
  if (typeof window === 'undefined') return;
  if (readCookie(FIRST_TOUCH_COOKIE)) return; // already captured

  const params = new URLSearchParams(window.location.search);
  const utm: FirstTouch = {
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    utm_content: params.get('utm_content') ?? undefined,
  };
  if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign) return; // nothing to capture

  writeCookie(FIRST_TOUCH_COOKIE, JSON.stringify(utm), FIRST_TOUCH_MAX_AGE_DAYS);
}

function getFirstTouch(): FirstTouch {
  const raw = readCookie(FIRST_TOUCH_COOKIE);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as FirstTouch;
  } catch {
    return {};
  }
}

// Fires a GA4 custom event, automatically attaching whatever first-touch
// campaign data was captured for this visitor (if any) so events carry
// campaign attribution even though GA4's own session-scoped attribution
// only covers the session the link was actually clicked in.
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', name, { ...getFirstTouch(), ...params });
}
