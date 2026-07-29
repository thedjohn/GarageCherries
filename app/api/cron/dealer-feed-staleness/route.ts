import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/dealer-feed-staleness');
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// GET /api/cron/dealer-feed-staleness
// Called daily by Vercel Cron. Flags any dealer using the push-based
// 'sftp_incoming' feed protocol whose file hasn't been picked up in 48+
// hours -- either they've gone stale after previously working, or they set
// up SFTP access but never actually got their export tool pointed at it.
// Mirrors the existing sitemap-health cron's shape: only emails when there's
// actually something wrong. No staleness check exists today for the other
// two feed protocols (HTTPS/outbound-SFTP) -- this is scoped to the new one.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: dealers } = await admin
    .from('dealers')
    .select('id, name, email, feed_sftp_provisioned_at, feed_sftp_last_received_at')
    .eq('feed_protocol', 'sftp_incoming');

  const now = Date.now();
  const stale = (dealers ?? []).filter(d => {
    const lastReceived = d.feed_sftp_last_received_at ? new Date(d.feed_sftp_last_received_at).getTime() : null;
    if (lastReceived !== null) return now - lastReceived > STALE_THRESHOLD_MS;
    // Never received anything -- only worth flagging once they've had a
    // reasonable window to actually configure their export tool, not on the
    // very next run after they provisioned.
    const provisioned = d.feed_sftp_provisioned_at ? new Date(d.feed_sftp_provisioned_at).getTime() : null;
    return provisioned !== null && now - provisioned > STALE_THRESHOLD_MS;
  });

  if (stale.length > 0) {
    const lines = stale.map(d => {
      const last = d.feed_sftp_last_received_at
        ? `last file received ${new Date(d.feed_sftp_last_received_at).toLocaleString()}`
        : `never received a file (provisioned ${d.feed_sftp_provisioned_at ? new Date(d.feed_sftp_provisioned_at).toLocaleString() : 'unknown'})`;
      return `${d.name} (${d.email}) — ${last}`;
    });
    notifyAdmin('Dealer SFTP feeds gone stale', lines.join('<br/>'));
    log.warn('Dealer feed staleness check found stale feeds', { staleCount: stale.length });
  } else {
    log.info('Dealer feed staleness check passed', { checkedCount: dealers?.length ?? 0 });
  }
  await log.flush();

  return NextResponse.json({ ok: stale.length === 0, checkedCount: dealers?.length ?? 0, staleCount: stale.length });
}
