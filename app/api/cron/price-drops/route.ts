import { NextRequest, NextResponse } from 'next/server';

// GET /api/cron/price-drops
// Called weekly by Vercel Cron.
// Delegates to the price-drop notification email route using ADMIN_API_SECRET.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com'}/api/email/price-drops`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
