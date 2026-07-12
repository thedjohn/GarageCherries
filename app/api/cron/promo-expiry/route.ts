import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/siteSettings';

// GET /api/cron/promo-expiry
// Called daily by Vercel Cron. Send window is derived from the configured
// promo_expires_at (superadmin-editable in /admin) — 2 weeks before through 1 day after.
// Delegates to the main promo-expiry email route using ADMIN_API_SECRET.
// Idempotent — the email route only sends to users not yet notified.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { promoExpiresAt } = await getSiteSettings();
  const cutoff = new Date(promoExpiresAt);
  const sendAfter = new Date(cutoff.getTime() - 14 * 24 * 60 * 60 * 1000);
  const stopAfter = new Date(cutoff.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now < sendAfter) {
    return NextResponse.json({ ok: true, skipped: true, reason: `Too early — before ${sendAfter.toISOString()}` });
  }
  if (now >= stopAfter) {
    return NextResponse.json({ ok: true, skipped: true, reason: `Promo period over — past ${stopAfter.toISOString()}` });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com'}/api/email/promo-expiry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
