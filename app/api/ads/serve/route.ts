import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { STATE_CENTROIDS, haversineMiles } from '@/lib/geo';

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

  // Uniform random pick among eligible advertisers -- NOT weighted by impressions.
  // Fairness across advertisers isn't implemented; only the ad-selection step
  // below (within a single advertiser's own ads) is impression-weighted.
  // See IMPLEMENTATION_STATUS.md backlog if this needs to become real fairness.
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
