import { NextRequest, NextResponse, after } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { notifyWatchersCarSold } from '@/lib/notifyCarSold';
import { deleteListingVideos } from '@/lib/deleteListingVideos';
import { isAuthorizedForSeller } from '@/lib/dealerAuth';

// POST /api/cars/sold — dealer marks a listing as sold
export async function POST(request: NextRequest) {
  const { carId, soldPrice } = await request.json();
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const admin = createAdminClient();
  const { data: car } = await admin.from('listings').select('id, seller_id, title, youtube_video_id, facebook_reel_id, instagram_media_id').eq('id', carId).single();
  if (!car || !(await isAuthorizedForSeller(user.id, car.seller_id))) {
    return NextResponse.json({ error: 'Not authorized to update this listing' }, { status: 403 });
  }

  const { error } = await admin.from('listings').update({
    is_sold: true,
    sold_at: new Date().toISOString(),
    sold_price: soldPrice ?? null,
  }).eq('id', carId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify watchlist users that this car has sold. Wrapped in after() for the
  // same reason as the video cleanup below: keeps the function alive until the
  // emails are sent instead of freezing it once the response goes out.
  after(() => notifyWatchersCarSold(admin, carId, car.title, car.seller_id));

  // Clean up the sold car's social videos so they don't keep advertising it
  // as available. Wrapped in after() so the runtime keeps the function alive
  // until the deletes and the ID-clearing write finish, instead of freezing
  // it right after the response goes out.
  after(() => deleteListingVideos(admin, carId, car));

  return NextResponse.json({ ok: true });
}
