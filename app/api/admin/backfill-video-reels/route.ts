import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { triggerListingVideo } from '@/lib/videoPipeline';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin/backfill-video-reels');
const BATCH_SIZE = 5;

// GET /api/admin/backfill-video-reels — one-off, manually-triggered endpoint
// (not on a schedule) for listings that were photo-posted to Facebook before
// the video pipeline existed, so they have fb_posted_at set but never got a
// Reel. Reuses the same triggerListingVideo() fire-and-forget call the normal
// photo-post flow makes -- it does NOT repost the photo, only queues video
// generation, since the photo is already live. Processes a small batch per
// call (same size as the hourly Facebook post cron) so triggering it doesn't
// burst a large number of Reels at once; call repeatedly to drain the backlog.
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
    .is('reel_posted_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  for (const listing of pending ?? []) {
    triggerListingVideo(listing).catch(() => {});
  }

  log.info('Video reel backfill batch triggered', { triggered: pending?.length ?? 0 });
  await log.flush();

  return NextResponse.json({ ok: true, triggered: pending?.length ?? 0 });
}
