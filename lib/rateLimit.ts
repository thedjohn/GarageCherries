import { NextRequest } from 'next/server';

interface Entry { count: number; reset: number }

// Module-level store — persists across requests on the same instance.
// On Vercel serverless, each warm instance maintains its own counter.
// For high-traffic production, swap this Map for Upstash Redis:
//   npm install @upstash/ratelimit @upstash/redis
const store = new Map<string, Entry>();

// Periodically prune expired entries to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.reset) store.delete(key);
  }
}, 60_000);

export interface RateLimitResult {
  allowed: boolean;
  firstBlock: boolean; // true only on the first blocked request — use this to send a one-time alert
}

/**
 * Returns whether the request is allowed and whether this is the first block in the window.
 * @param key     Unique identifier (e.g. `${route}:${ip}`)
 * @param max     Maximum requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, firstBlock: false };
  }

  if (entry.count >= max) {
    const firstBlock = entry.count === max; // exactly at the threshold — first rejection
    entry.count++;
    return { allowed: false, firstBlock };
  }

  entry.count++;
  return { allowed: true, firstBlock: false };
}

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
