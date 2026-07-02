import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Approximate geographic center (lat, lng) for each US state
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL:[32.8,-86.8],AK:[64.2,-153.4],AZ:[34.3,-111.1],AR:[34.9,-92.4],CA:[36.8,-119.4],
  CO:[39.0,-105.5],CT:[41.6,-72.7],DE:[39.0,-75.5],FL:[27.8,-81.6],GA:[32.7,-83.4],
  HI:[20.9,-156.9],ID:[44.4,-114.6],IL:[40.0,-89.2],IN:[39.9,-86.3],IA:[42.1,-93.5],
  KS:[38.5,-98.4],KY:[37.5,-85.3],LA:[31.2,-91.8],ME:[45.4,-69.0],MD:[39.1,-76.8],
  MA:[42.2,-71.5],MI:[44.3,-85.4],MN:[46.4,-93.1],MS:[32.7,-89.7],MO:[38.5,-92.5],
  MT:[47.0,-110.0],NE:[41.5,-99.9],NV:[38.5,-117.0],NH:[43.7,-71.6],NJ:[40.1,-74.5],
  NM:[34.5,-106.2],NY:[43.0,-75.5],NC:[35.5,-79.8],ND:[47.5,-100.5],OH:[40.4,-82.8],
  OK:[35.6,-97.5],OR:[44.0,-120.5],PA:[40.6,-77.2],RI:[41.7,-71.5],SC:[33.9,-80.9],
  SD:[44.4,-100.2],TN:[35.9,-86.7],TX:[31.5,-99.3],UT:[39.3,-111.1],VT:[44.0,-72.7],
  VA:[37.8,-79.4],WA:[47.4,-120.5],WV:[38.6,-80.6],WI:[44.3,-89.8],WY:[43.0,-107.6],
  DC:[38.9,-77.0],PR:[18.2,-66.5],GU:[13.4,144.8],VI:[18.3,-64.9],AS:[-14.3,-170.7],MP:[15.1,145.7],
};

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// GET /api/ads/serve?state=IL&path=/listings/...
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';

  const admin = createAdminClient();

  // Find active advertisers that cover this state with valid trials
  const now = new Date().toISOString();
  const { data: advertisers } = await admin
    .from('advertisers')
    .select('id, state, tier, radius_miles, trial_ends_at')
    .eq('active', true);

  if (!advertisers?.length) return NextResponse.json({ ad: null });

  const viewerCentroid = STATE_CENTROIDS[state.toUpperCase()] ?? null;

  // Match advertisers by radius:
  // - statewide: always eligible
  // - no viewer state provided: fall back to state match
  // - otherwise: check if advertiser's state centroid is within radius_miles of viewer's state centroid
  const eligible = advertisers.filter(a => {
    if (!a.trial_ends_at || a.trial_ends_at < now) return false;
    if (a.tier === 'statewide') return true;
    if (!state || !viewerCentroid) return !state || a.state === state;
    const adCentroid = STATE_CENTROIDS[a.state?.toUpperCase() ?? ''] ?? null;
    if (!adCentroid) return false;
    const miles = haversineMiles(viewerCentroid[0], viewerCentroid[1], adCentroid[0], adCentroid[1]);
    return miles <= (a.radius_miles ?? 9999);
  });

  if (!eligible.length) return NextResponse.json({ ad: null });

  // Pick a random eligible advertiser weighted toward those with fewer impressions
  const pick = eligible[Math.floor(Math.random() * eligible.length)];

  // Get their active ad
  const { data: ad } = await admin
    .from('ads')
    .select('id, advertiser_id, headline, body_copy, cta_label, cta_url, phone, logo_url, photo_url, rating, review_count, impressions')
    .eq('advertiser_id', pick.id)
    .eq('active', true)
    .order('impressions', { ascending: true })
    .limit(1)
    .single();

  if (!ad) return NextResponse.json({ ad: null });

  // Fetch business name for display
  const { data: advertiser } = await admin
    .from('advertisers')
    .select('business_name, city, state, category')
    .eq('id', pick.id)
    .single();

  // Log impression — awaited so counter is reliable
  await Promise.allSettled([
    admin.from('ad_events').insert({
      ad_id: ad.id,
      event_type: 'impression',
      page_path: url.searchParams.get('path') ?? '',
      geo_state: state,
    }),
    admin.rpc('inc_ad_impressions', { ad_id: ad.id }),
  ]);

  return NextResponse.json({
    ad: {
      ...ad,
      business_name: advertiser?.business_name ?? '',
      city: advertiser?.city ?? null,
      state: advertiser?.state ?? null,
      category: advertiser?.category ?? null,
    },
  });
}
