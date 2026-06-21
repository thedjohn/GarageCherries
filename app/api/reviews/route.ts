import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/reviews?dealerId=xxx
export async function GET(request: NextRequest) {
  const dealerId = request.nextUrl.searchParams.get('dealerId');
  if (!dealerId) return NextResponse.json({ error: 'dealerId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dealer_reviews')
    .select('id, reviewer_name, rating, review, created_at')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ reviews: [] });
  return NextResponse.json({ reviews: data ?? [] });
}

// POST /api/reviews — submit a review
export async function POST(request: NextRequest) {
  const { dealerId, rating, review, reviewerName } = await request.json();

  if (!dealerId || !rating) {
    return NextResponse.json({ error: 'dealerId and rating required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Must be logged in to leave a review' }, { status: 401 });

  const admin = createAdminClient();

  // One review per user per dealer
  const { data: existing } = await admin
    .from('dealer_reviews')
    .select('id')
    .eq('dealer_id', dealerId)
    .eq('reviewer_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'You have already reviewed this dealer' }, { status: 409 });
  }

  const { error } = await admin.from('dealer_reviews').insert({
    dealer_id: dealerId,
    reviewer_id: user.id,
    reviewer_name: reviewerName ?? null,
    rating,
    review: review ?? null,
  });

  if (error) return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
