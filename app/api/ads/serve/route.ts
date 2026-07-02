import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/ads/serve?state=IL&path=/listings/...
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';

  const admin = createAdminClient();

  // Find active advertisers that cover this state with valid trials
  const now = new Date().toISOString();
  const { data: advertisers } = await admin
    .from('advertisers')
    .select('id, state, tier, trial_ends_at')
    .eq('active', true);

  if (!advertisers?.length) return NextResponse.json({ ad: null });

  // Match: statewide tier shows everywhere; others must match state
  // Exclude advertisers whose trial has expired
  const eligible = advertisers.filter(a =>
    (a.tier === 'statewide' || !state || a.state === state) &&
    (!a.trial_ends_at || a.trial_ends_at > now)
  );

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
