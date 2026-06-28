import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  const { listingId, dealerId } = await request.json();
  if (!listingId || !dealerId) return NextResponse.json({ ok: false });

  // Hash the IP so we never store raw IPs
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  const ipHash = createHash('sha256').update(ip + listingId).digest('hex').slice(0, 16);

  const supabase = createAdminClient();

  // Deduplicate: only count one view per ip_hash per listing per day
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('listing_views')
    .select('id')
    .eq('listing_id', listingId)
    .eq('ip_hash', ipHash)
    .gte('viewed_at', `${today}T00:00:00Z`)
    .maybeSingle();

  if (!existing) {
    await supabase.from('listing_views').insert({ listing_id: listingId, dealer_id: dealerId, ip_hash: ipHash });
  }

  return NextResponse.json({ ok: true });
}
