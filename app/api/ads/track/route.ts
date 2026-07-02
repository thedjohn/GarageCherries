import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

// POST /api/ads/track — log a click
export async function POST(request: NextRequest) {
  // Rate limit per IP to prevent click stuffing (60 clicks/hour total across all ads)
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`ads-track:${ip}`, 60, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const { adId, type, path, state } = await request.json();
  if (!adId) return NextResponse.json({ error: 'adId required' }, { status: 400 });

  const admin = createAdminClient();

  await admin.from('ad_events').insert({
    ad_id: adId,
    event_type: type ?? 'click',
    page_path: path ?? '',
    geo_state: state ?? '',
  });

  // Atomic increment — race-condition safe
  await admin.rpc('inc_ad_clicks', { ad_id: adId });

  return NextResponse.json({ ok: true });
}
