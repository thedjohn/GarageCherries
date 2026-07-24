import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { postListingToFacebook } from '@/lib/facebook/postToPage';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/facebook-post-queue');
const BATCH_SIZE = 5;

// GET /api/cron/facebook-post-queue
// Runs hourly via Vercel Cron. Posts a small, fixed batch of not-yet-posted
// approved listings to the Facebook Page, oldest first, regardless of how
// they were created (feed sync, dealer direct-add, admin approval). A large
// batch of new listings -- most notably a dealer's first feed sync, which can
// insert dozens at once -- trickles out a few per hour instead of posting
// everything at once, which would hit Facebook's own rate limit or read as a
// spam burst to real Page followers. Listings that fail to post (e.g. a
// transient Facebook error) are left with fb_posted_at null and retried on a
// later run.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from('listings')
    .select('id, title, make, model, year, price, slug, images')
    .eq('status', 'approved')
    .eq('is_sold', false)
    .is('fb_posted_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  let posted = 0;
  for (const listing of pending ?? []) {
    const success = await postListingToFacebook(listing);
    if (success) {
      await admin.from('listings').update({ fb_posted_at: new Date().toISOString() }).eq('id', listing.id);
      posted++;
    }
  }

  log.info('Facebook post queue drained', { checked: pending?.length ?? 0, posted });
  await log.flush();

  return NextResponse.json({ ok: true, checked: pending?.length ?? 0, posted });
}
