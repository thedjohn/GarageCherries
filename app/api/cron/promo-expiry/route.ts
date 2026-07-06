import { NextRequest, NextResponse } from 'next/server';

// GET /api/cron/promo-expiry
// Called daily by Vercel Cron starting Oct 17 2026.
// Delegates to the main promo-expiry email route using ADMIN_API_SECRET.
// Idempotent — the email route only sends to users not yet notified.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only send after Oct 17 2026 (2 weeks before Oct 31 cutoff)
  const sendAfter = new Date('2026-10-17T00:00:00Z');
  const stopAfter = new Date('2026-11-01T00:00:00Z');
  const now = new Date();

  if (now < sendAfter) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Too early — before Oct 17 2026' });
  }
  if (now >= stopAfter) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Promo period over — past Nov 1 2026' });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com'}/api/email/promo-expiry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
