import { NextRequest, NextResponse } from 'next/server';

// GET /api/cron/expiring-listings
// Called daily by Vercel Cron.
// Delegates to the expiring-listings email route using ADMIN_API_SECRET.
// Idempotent — the email route only sends to listings not yet reminded.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com'}/api/email/expiring-listings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
