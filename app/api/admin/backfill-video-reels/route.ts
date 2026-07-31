import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { triggerListingVideo } from '@/lib/videoPipeline';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin/backfill-video-reels');
// The VPS renders one video at a time (MAX_CONCURRENT_JOBS = 1 in
// server.js) and hard-rejects anything beyond ~20 queued jobs with a 429
// that triggerListingVideo() does not retry. Keep this batch comfortably
// under that ceiling so a single run -- or the hourly workflow -- never
// floods the VPS or gets silently dropped.
const MAX_BATCH = 15;

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
  // A fresh builder per tier, not a shared one -- Supabase's query builder
  // mutates and returns `this` on each filter call, so reusing one instance
  // across two branches would stack the first branch's filters onto the
  // second instead of giving it a clean slate.
  const baseQuery = () =>
    admin
      .from('listings')
      .select('id, make, model, year, price, images')
      .eq('status', 'approved')
      .eq('is_sold', false)
      .not('fb_posted_at', 'is', null);

  // Two tiers, not one combined query -- TikTok can stay broken for weeks at
  // a time (audit/quota), and a listing stuck only on TikTok never stops
  // matching a single "missing anything" query. Oldest-first ordering would
  // then let that listing occupy the batch every single run forever,
  // starving newer listings that still need their very first Instagram/
  // YouTube post. Tier 1 (genuinely needs a platform other than TikTok)
  // always goes first; tier 2 (TikTok-only stragglers) only fills
  // whatever's left over. Once TikTok works again, tier 2 sweeps them up
  // on its own -- nothing to remember to re-enable.
  //
  // Wrapped in try/catch, unlike a fire-and-forget posting call -- a
  // transient DB timeout here (seen in production: ETIMEDOUT) would
  // otherwise throw uncaught and crash the whole request instead of just
  // skipping this run. The hourly workflow retries naturally next cycle,
  // so failing loudly-but-gracefully here is enough; no need to retry
  // inline.
  let needsCore: { id: string; make: string; model: string; year: number; price: number; images: string[] | null }[] | null;
  let tiktokOnly: typeof needsCore = [];
  try {
    ({ data: needsCore } = await baseQuery()
      .or('reel_posted_at.is.null,instagram_posted_at.is.null,youtube_posted_at.is.null')
      .order('created_at', { ascending: true })
      .limit(MAX_BATCH));

    const remaining = MAX_BATCH - (needsCore?.length ?? 0);
    if (remaining > 0) {
      const { data } = await baseQuery()
        .not('reel_posted_at', 'is', null)
        .not('instagram_posted_at', 'is', null)
        .not('youtube_posted_at', 'is', null)
        .is('tiktok_posted_at', null)
        .order('created_at', { ascending: true })
        .limit(remaining);
      tiktokOnly = data ?? [];
    }
  } catch (err) {
    log.error('Video reel backfill query failed', err instanceof Error ? err : new Error(String(err)));
    await log.flush();
    return NextResponse.json({ ok: false, error: 'Query failed' }, { status: 500 });
  }

  const pending = [...(needsCore ?? []), ...tiktokOnly];

  for (const listing of pending) {
    triggerListingVideo(listing).catch(() => {});
  }

  log.info('Video reel backfill batch triggered', { triggered: pending.length, needsCore: needsCore?.length ?? 0, tiktokOnly: tiktokOnly.length });
  await log.flush();

  return NextResponse.json({ ok: true, triggered: pending.length });
}
