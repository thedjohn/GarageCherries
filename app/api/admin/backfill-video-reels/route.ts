import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { triggerListingVideo } from '@/lib/videoPipeline';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin/backfill-video-reels');
// Safety ceiling, not a pacing mechanism -- unlike the hourly cron's small
// batch size, this doesn't need to self-limit for burst avoidance: the VPS's
// own render queue (2 concurrent) already spreads the resulting Reel posts
// out over time as each video finishes. This cap just guards against an
// unbounded query if something's misconfigured.
const MAX_BATCH = 200;

// GET /api/admin/backfill-video-reels — one-off, manually-triggered endpoint
// (not on a schedule) for listings that are missing a video on at least one
// of the four platforms (Facebook Reel, Instagram, YouTube, TikTok) --
// originally built for listings that were photo-posted to Facebook before
// the video pipeline existed at all, and generalized to also catch listings
// that already have a video on some platforms but not others (e.g. older
// listings that predate YouTube/TikTok support). Reuses the same
// triggerListingVideo() fire-and-forget call the normal photo-post flow
// makes -- it does NOT repost the photo, only queues video generation, since
// the photo is already live. The completion route (video-pipeline/complete)
// checks each platform's own `*_posted_at` column independently, so
// re-rendering a listing that already has some platforms done safely skips
// re-posting to those and only fills in what's missing.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from('listings')
    .select('id, make, model, year, price, images')
    .eq('status', 'approved')
    .eq('is_sold', false)
    .not('fb_posted_at', 'is', null)
    .or('reel_posted_at.is.null,instagram_posted_at.is.null,youtube_posted_at.is.null,tiktok_posted_at.is.null')
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH);

  for (const listing of pending ?? []) {
    triggerListingVideo(listing).catch(() => {});
  }

  log.info('Video reel backfill batch triggered', { triggered: pending?.length ?? 0 });
  await log.flush();

  return NextResponse.json({ ok: true, triggered: pending?.length ?? 0 });
}
