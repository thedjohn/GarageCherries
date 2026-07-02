import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function getAdvertiser(supabase: any, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from('advertisers').select('*').eq('user_id', userId).single();
  return data;
}

// GET /api/advertiser/ads — get advertiser's ads + stats
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const advertiser = await getAdvertiser(supabase, user.id);
  if (!advertiser) return NextResponse.json({ error: 'Not an advertiser' }, { status: 403 });

  const admin = createAdminClient();
  const { data: ads } = await admin
    .from('ads')
    .select('*')
    .eq('advertiser_id', advertiser.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ advertiser, ads: ads ?? [] });
}

// POST /api/advertiser/ads — create or update ad
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const advertiser = await getAdvertiser(supabase, user.id);
  if (!advertiser) return NextResponse.json({ error: 'Not an advertiser' }, { status: 403 });

  if (advertiser.trial_ends_at && new Date(advertiser.trial_ends_at) < new Date()) {
    return NextResponse.json({ error: 'TRIAL_EXPIRED', message: 'Your trial has ended. Please upgrade to continue creating ads.' }, { status: 403 });
  }

  const body = await request.json();
  const { id, headline, bodyCopy, ctaLabel, ctaUrl, phone, logoUrl, photoUrl, rating, reviewCount } = body;

  // Block javascript: and other non-HTTP schemes to prevent stored XSS
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
    return NextResponse.json({ error: 'Ad URL must start with http:// or https://' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (id) {
    // Update
    const { error } = await admin.from('ads').update({
      headline:     headline || null,
      body_copy:    bodyCopy || null,
      cta_label:    ctaLabel || 'Learn More',
      cta_url:      ctaUrl || null,
      phone:        phone || null,
      logo_url:     logoUrl || null,
      photo_url:    photoUrl || null,
      rating:       rating ? Number(rating) : null,
      review_count: reviewCount ? Number(reviewCount) : null,
      updated_at:   new Date().toISOString(),
    }).eq('id', id).eq('advertiser_id', advertiser.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Create
  const { data, error } = await admin.from('ads').insert({
    advertiser_id: advertiser.id,
    headline:     headline || null,
    body_copy:    bodyCopy || null,
    cta_label:    ctaLabel || 'Learn More',
    cta_url:      ctaUrl || null,
    phone:        phone || null,
    logo_url:     logoUrl || null,
    photo_url:    photoUrl || null,
    rating:       rating ? Number(rating) : null,
    review_count: reviewCount ? Number(reviewCount) : null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad: data });
}

// DELETE /api/advertiser/ads?id=xxx
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const advertiser = await getAdvertiser(supabase, user.id);
  if (!advertiser) return NextResponse.json({ error: 'Not an advertiser' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  await admin.from('ads').delete().eq('id', id).eq('advertiser_id', advertiser.id);
  return NextResponse.json({ ok: true });
}
