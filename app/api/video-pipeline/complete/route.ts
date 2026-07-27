import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { postListingReelToFacebook, postListingReelToInstagram } from '@/lib/facebook/postToPage';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/video-pipeline/complete');

// POST /api/video-pipeline/complete — called by the InterServer VPS once it
// finishes (or fails) building a listing's video. Authenticated the same way
// as the cron routes (a shared secret, not a user session) since the caller
// is the VPS, not a browser. On success, posts the finished video as a Reel
// to Facebook (and Instagram, once its permissions are upgraded) and marks
// reel_posted_at so it isn't posted again. On failure, just logs it -- same
// tolerance as the existing photo-posting pipeline, a listing that fails to
// get a video simply doesn't get one.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.VIDEO_PIPELINE_CALLBACK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listingId, success, videoUrl, error } = await request.json();
  if (!listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 });
  }

  if (!success || !videoUrl) {
    log.warn('Video pipeline job reported failure', { listingId, error });
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('listings')
    .select('id, title, make, model, year, price, slug, images, mileage, condition, location, state')
    .eq('id', listingId)
    .single();

  if (!listing) {
    log.warn('Video pipeline callback for unknown listing', { listingId });
    return NextResponse.json({ ok: true });
  }

  const fbSuccess = await postListingReelToFacebook(listing, videoUrl);
  postListingReelToInstagram(listing, videoUrl).catch(() => {});

  if (fbSuccess) {
    await admin.from('listings').update({ reel_posted_at: new Date().toISOString() }).eq('id', listingId);
  }

  return NextResponse.json({ ok: true, fbSuccess });
}
