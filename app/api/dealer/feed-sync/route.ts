import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { syncDealerFeed, summarizeFeedSync } from '@/app/api/cron/dealer-feed-sync/route';
import { MAKES } from '@/lib/types';

// POST /api/dealer/feed-sync -- runs the authenticated dealer's own feed sync
// immediately, on demand ("Sync now" in the dashboard), reusing the exact same
// sync logic the daily cron uses.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: dealer } = await admin
    .from('dealers')
    .select('id, name, phone, email, location, state, feed_url, feed_protocol, feed_host, feed_port, feed_username, feed_password, feed_remote_path')
    .eq('id', user.id)
    .single();

  if (!dealer) return NextResponse.json({ error: 'Dealer not found' }, { status: 403 });
  const hasFeed = dealer.feed_url || (dealer.feed_protocol === 'sftp' && dealer.feed_host);
  if (!hasFeed) return NextResponse.json({ error: 'No feed configured. Add one in Settings first.' }, { status: 400 });

  const knownMakes = new Set(MAKES.map(m => m.toLowerCase()));
  const result = await syncDealerFeed(admin, dealer, dealer.feed_url, knownMakes);
  const summary = summarizeFeedSync(result);

  await admin.from('dealers').update({
    feed_last_synced_at: new Date().toISOString(),
    feed_last_sync_summary: summary,
  }).eq('id', dealer.id);

  return NextResponse.json({ ok: result.errors.length === 0, result, summary });
}
