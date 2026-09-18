import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { postListingToFacebook } from '@/lib/facebook/postToPage';
import { triggerListingVideo } from '@/lib/videoPipeline';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/facebook-post-queue');
const BATCH_SIZE = 5;
// After this many failed attempts, stop retrying a listing and log it once as
// "gave up" instead of erroring every hourly run. 5 hourly tries is plenty of
// room for a transient Facebook error to clear on its own, while capping the
// worst case (a listing Facebook will just never accept) to well under a day
// of noise.
const MAX_ATTEMPTS = 5;

// GET /api/cron/facebook-post-queue
// Runs hourly via Vercel Cron. Posts a small, fixed batch of not-yet-posted
// approved listings to the Facebook Page, oldest first, regardless of how
// they were created (feed sync, dealer direct-add, admin approval). A large
// batch of new listings -- most notably a dealer's first feed sync, which can
// insert dozens at once -- trickles out a few per hour instead of posting
// everything at once, which would hit Facebook's own rate limit or read as a
// spam burst to real Page followers. Listings that fail to post (e.g. a
// transient Facebook error) are left with fb_posted_at null and retried on a
// later run, up to MAX_ATTEMPTS.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from('listings')
    .select('id, title, make, model, year, price, slug, images, mileage, condition, location, state, fb_post_attempts')
    .eq('status', 'approved')
    .eq('is_sold', false)
    .is('fb_posted_at', null)
    .lt('fb_post_attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  let posted = 0;
  let gaveUp = 0;
  for (const listing of pending ?? []) {
    const success = await postListingToFacebook(listing);
    if (success) {
      await admin.from('listings').update({ fb_posted_at: new Date().toISOString() }).eq('id', listing.id);
      posted++;
      triggerListingVideo(listing).catch(() => {});
    } else {
      const attempts = (listing.fb_post_attempts ?? 0) + 1;
      await admin.from('listings').update({ fb_post_attempts: attempts }).eq('id', listing.id);
      if (attempts >= MAX_ATTEMPTS) {
        gaveUp++;
        log.info('Facebook post gave up after max attempts', { listingId: listing.id, attempts });
      }
    }
  }

  log.info('Facebook post queue drained', { checked: pending?.length ?? 0, posted, gaveUp });
  await log.flush();

  return NextResponse.json({ ok: true, checked: pending?.length ?? 0, posted, gaveUp });
}
