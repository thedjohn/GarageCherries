import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/ads/track — log a click
export async function POST(request: NextRequest) {
  const { adId, type, path, state } = await request.json();
  if (!adId) return NextResponse.json({ error: 'adId required' }, { status: 400 });

  const admin = createAdminClient();

  await admin.from('ad_events').insert({
    ad_id: adId,
    event_type: type ?? 'click',
    page_path: path ?? '',
    geo_state: state ?? '',
  });

  // Increment click counter
  const { data: ad } = await admin.from('ads').select('clicks').eq('id', adId).single();
  if (ad) {
    await admin.from('ads').update({ clicks: (ad.clicks ?? 0) + 1 }).eq('id', adId);
  }

  return NextResponse.json({ ok: true });
}
