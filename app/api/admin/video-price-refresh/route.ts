import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { triggerListingVideo } from '@/lib/videoPipeline';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin/video-price-refresh');

// Same VPS queue-ceiling reasoning as MAX_BATCH in backfill-video-reels,
// but smaller: a refresh does strictly more work per listing (post new +
// delete old, across up to 3 platforms) than backfill's simpler "post if
// missing", so this stays well under the ~20-job ceiling even alongside
// whatever backfill/new-listing traffic is already using the same queue.
const MAX_BATCH = 10;

// Debounce -- if a listing's price is edited multiple times in quick
// succession, or a platform keeps failing, don't re-render its video after
// every single run. Purely a throttle on how often a render gets triggered;
// it does not track success and is unrelated to which platform(s) actually
// need the refresh (see isPlatformStale below).
const DEBOUNCE_DAYS = 7;

interface Candidate {
  id: string; make: string; model: string; year: number; price: number; images: string[] | null;
  price_dropped_at: string | null;
  reel_posted_at: string | null; instagram_posted_at: string | null; youtube_posted_at: string | null;
  video_refresh_last_attempted_at: string | null;
}

function isPlatformStale(postedAt: string | null, priceDroppedAt: string | null): boolean {
  if (!priceDroppedAt || !postedAt) return false;
  return new Date(postedAt).getTime() < new Date(priceDroppedAt).getTime();
}

// A listing is actually due if at least one already-posted platform is
// older than the last price drop -- matches video-pipeline/complete's own
// per-platform isStale() check, so this only ever triggers a render for
// listings that check has something real left to do. Exported for testing.
export function isDue(listing: Candidate, now: number): boolean {
  const debounceCutoff = now - DEBOUNCE_DAYS * 24 * 60 * 60 * 1000;
  if (listing.video_refresh_last_attempted_at && new Date(listing.video_refresh_last_attempted_at).getTime() > debounceCutoff) {
    return false;
  }
  return isPlatformStale(listing.reel_posted_at, listing.price_dropped_at)
    || isPlatformStale(listing.instagram_posted_at, listing.price_dropped_at)
    || isPlatformStale(listing.youtube_posted_at, listing.price_dropped_at);
}

// GET /api/admin/video-price-refresh — scheduled (see
// .github/workflows/video-price-refresh.yml), also manually triggerable.
// Finds listings with at least one social video that's stale relative to
// the listing's last price drop, and re-triggers video generation for them
// via the same triggerListingVideo() call new listings use.
// video-pipeline/complete does the actual per-platform staleness check and
// repost/cleanup when its callback fires -- this route only decides which
// listings are worth kicking off a fresh render for at all, and stamps
// video_refresh_last_attempted_at purely to debounce repeat runs.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  let candidates: Candidate[] | null;
  try {
    ({ data: candidates } = await admin
      .from('listings')
      .select('id, make, model, year, price, images, price_dropped_at, reel_posted_at, instagram_posted_at, youtube_posted_at, video_refresh_last_attempted_at')
      .eq('status', 'approved')
      .eq('is_sold', false)
      .not('price_dropped_at', 'is', null)
      .order('price_dropped_at', { ascending: true })
      .limit(200)); // generous candidate pool -- isDue() below does the real filtering; MAX_BATCH caps what actually triggers
  } catch (err) {
    log.error('Video price-refresh query failed', err instanceof Error ? err : new Error(String(err)));
    await log.flush();
    return NextResponse.json({ ok: false, error: 'Query failed' }, { status: 500 });
  }

  const now = Date.now();
  const due = (candidates ?? []).filter(c => isDue(c, now)).slice(0, MAX_BATCH);

  for (const listing of due) {
    triggerListingVideo(listing).catch(() => {});
    void admin.from('listings').update({ video_refresh_last_attempted_at: new Date().toISOString() }).eq('id', listing.id);
  }

  log.info('Video price-refresh batch triggered', { triggered: due.length, candidates: candidates?.length ?? 0 });
  await log.flush();

  return NextResponse.json({ ok: true, triggered: due.length });
}
