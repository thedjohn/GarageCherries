import { NextRequest, NextResponse, after } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isAuthorizedForSeller } from '@/lib/dealerAuth';
import { deleteListingVideos } from '@/lib/deleteListingVideos';
import { submitToIndexNow } from '@/lib/indexNow';
import { toSegment } from '@/lib/data';

// POST /api/listings/[id]/remove — seller takes their own listing down
// ("Remove listing" on My Listings). Sets status to 'removed' rather than
// deleting the row, so it disappears from the site (public reads only see
// approved listings) but can be restored if the seller changes their mind.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('listings')
    .select('id, seller_id, status, is_sold, is_feed_managed, make, model, slug, youtube_video_id, facebook_reel_id, instagram_media_id')
    .eq('id', id)
    .single();

  if (!listing || !(await isAuthorizedForSeller(user.id, listing.seller_id))) {
    return NextResponse.json({ error: 'Not authorized to update this listing' }, { status: 403 });
  }
  if (listing.status === 'removed' || listing.is_sold) {
    return NextResponse.json({ error: 'This listing is already removed or sold' }, { status: 400 });
  }
  if (listing.is_feed_managed) {
    return NextResponse.json({ error: 'Feed-managed listings are removed automatically when they leave your inventory feed' }, { status: 400 });
  }

  const { error } = await admin.from('listings').update({ status: 'removed' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Same cleanup as marking a car sold: its social videos shouldn't keep
  // advertising it. after() keeps the function alive until the deletes finish.
  after(() => deleteListingVideos(admin, id, listing));

  // Tell Bing the page is gone -- fire and forget.
  if (listing.status === 'approved' && listing.make && listing.model && listing.slug) {
    submitToIndexNow([`https://www.garagecherries.com/listings/${toSegment(listing.make)}/${toSegment(listing.model)}/${id}/${listing.slug}`]).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
