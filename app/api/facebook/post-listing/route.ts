import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { postListingToFacebook } from '@/lib/facebook/postToPage';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

// POST /api/facebook/post-listing — called client-side right after a dealer
// creates a new listing, which goes live immediately (unlike public listing
// submissions, which post to Facebook from the admin approval flow instead).
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`facebook-post-listing:${ip}`, 20, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { carId } = await request.json();
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('listings')
    .select('id, title, make, model, year, price, slug, images, seller_id')
    .eq('id', carId)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  postListingToFacebook(listing)
    .then(success => { if (success) admin.from('listings').update({ fb_posted_at: new Date().toISOString() }).eq('id', carId); })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
