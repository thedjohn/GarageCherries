import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { submitToIndexNow } from '@/lib/indexNow';
import { toSegment } from '@/lib/data';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

// POST /api/indexnow/submit — called client-side right after a dealer creates
// a new listing, which goes live immediately (mirrors /api/facebook/post-listing,
// used the same way for the same reason: public listing submissions notify
// IndexNow from the admin approval flow instead, since that's server-side).
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`indexnow-submit:${ip}`, 20, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { carId } = await request.json();
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('listings')
    .select('id, make, model, slug, seller_id')
    .eq('id', carId)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = `https://www.garagecherries.com/listings/${toSegment(listing.make)}/${toSegment(listing.model)}/${listing.id}/${listing.slug}`;
  submitToIndexNow([url]).catch(() => {});

  return NextResponse.json({ ok: true });
}
