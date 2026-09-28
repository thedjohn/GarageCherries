import { NextRequest, NextResponse } from 'next/server';

// GET /api/cron/event-alerts
// Called every Thursday by Vercel Cron. Delegates to the actual sending
// logic via ADMIN_API_SECRET, same pattern as /api/cron/digest.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com'}/api/email/event-alerts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
