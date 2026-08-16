import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { notifyWatchersCarSold } from '@/lib/notifyCarSold';
import { deleteListingVideos } from '@/lib/deleteListingVideos';

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
  if (!car || car.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to update this listing' }, { status: 403 });
  }

  const { error } = await admin.from('listings').update({
    is_sold: true,
    sold_at: new Date().toISOString(),
    sold_price: soldPrice ?? null,
  }).eq('id', carId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify watchlist users that this car has sold (fire-and-forget)
  void notifyWatchersCarSold(admin, carId, car.title, car.seller_id);

  // Clean up the sold car's social videos so they don't keep advertising it
  // as available (fire-and-forget, same tolerance as the notification above)
  void deleteListingVideos(admin, carId, car);

  return NextResponse.json({ ok: true });
}
