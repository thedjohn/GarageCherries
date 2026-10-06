import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { syncDealerFeed, summarizeFeedSync } from '@/app/api/cron/dealer-feed-sync/route';
import { MAKES } from '@/lib/types';

// POST /api/admin/dealers/feed-sync { dealerId } -- admin "Sync feed now" for
// any dealer, so a fresh file (e.g. after a dealer's export pauses and
// resumes) can be imported right away instead of waiting for that dealer's
// daily cron hour. Same sync logic and dealer-row stamps as the dealer's own
// on-demand route (app/api/dealer/feed-sync/route.ts).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealerId } = await request.json().catch(() => ({}));
  if (!dealerId) return NextResponse.json({ error: 'dealerId is required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: dealer } = await admin
    .from('dealers')
    .select('id, name, phone, email, location, state, feed_url, feed_protocol, feed_host, feed_port, feed_username, feed_password, feed_remote_path, feed_sftp_last_received_at, feed_format, feed_auth_token')
    .eq('id', dealerId)
    .single();
  if (!dealer) return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });

  const hasFeed = dealer.feed_url || (dealer.feed_protocol === 'sftp' && dealer.feed_host) || dealer.feed_protocol === 'sftp_incoming';
  if (!hasFeed) return NextResponse.json({ error: 'This dealer has no feed configured.' }, { status: 400 });

  const knownMakes = new Set(MAKES.map(m => m.toLowerCase()));
  const result = await syncDealerFeed(admin, dealer, dealer.feed_url, knownMakes);
  const summary = summarizeFeedSync(result);

  await admin.from('dealers').update({
    feed_last_synced_at: new Date().toISOString(),
    feed_last_sync_summary: summary,
    // Gated on no errors -- see the matching comments in the cron route.
    ...(result.errors.length === 0 && result.sourceMtime ? { feed_sftp_last_received_at: result.sourceMtime } : {}),
    ...(result.errors.length === 0 ? { feed_last_success_at: new Date().toISOString() } : {}),
  }).eq('id', dealer.id);

  return NextResponse.json({ ok: result.errors.length === 0, result, summary });
}
