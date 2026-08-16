import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { createLogger } from '@/lib/logger';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';

const log = createLogger('cron/dealer-feed-staleness');
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

interface DealerRow {
  id: string; name: string; email: string; feed_protocol: string | null;
  feed_sftp_provisioned_at: string | null; feed_sftp_last_received_at: string | null;
  feed_last_success_at: string | null;
}

interface StaleDealer {
  id: string; name: string; email: string; protocol: string; detail: string;
}

function findStale(dealers: DealerRow[], now: number): StaleDealer[] {
  const stale: StaleDealer[] = [];
  for (const d of dealers) {
    if (d.feed_protocol === 'sftp_incoming') {
      const lastReceived = d.feed_sftp_last_received_at ? new Date(d.feed_sftp_last_received_at).getTime() : null;
      if (lastReceived !== null) {
        if (now - lastReceived > STALE_THRESHOLD_MS) {
          stale.push({ id: d.id, name: d.name, email: d.email, protocol: d.feed_protocol, detail: `last file received ${new Date(d.feed_sftp_last_received_at!).toLocaleString()}` });
        }
      } else {
        // Never received anything -- only worth flagging once they've had a
        // reasonable window to actually configure their export tool, not on
        // the very next run after they provisioned.
        const provisioned = d.feed_sftp_provisioned_at ? new Date(d.feed_sftp_provisioned_at).getTime() : null;
        if (provisioned !== null && now - provisioned > STALE_THRESHOLD_MS) {
          stale.push({ id: d.id, name: d.name, email: d.email, protocol: d.feed_protocol, detail: `never received a file (provisioned ${new Date(d.feed_sftp_provisioned_at!).toLocaleString()})` });
        }
      }
    } else if (d.feed_protocol === 'https' || d.feed_protocol === 'sftp') {
      // Only flags feeds that have succeeded before and then stopped -- a
      // feed that's never once synced successfully is a setup problem, not
      // a staleness one, and isn't covered here.
      const lastSuccess = d.feed_last_success_at ? new Date(d.feed_last_success_at).getTime() : null;
      if (lastSuccess !== null && now - lastSuccess > STALE_THRESHOLD_MS) {
        stale.push({ id: d.id, name: d.name, email: d.email, protocol: d.feed_protocol, detail: `last successful sync ${new Date(d.feed_last_success_at!).toLocaleString()}` });
      }
    }
  }
  return stale;
}

async function alertDealer(resend: Resend, dealer: StaleDealer) {
  await resend.emails.send({
    from: 'GarageCherries <noreply@garagecherries.com>',
    to: dealer.email,
    subject: 'Your GarageCherries inventory feed has stopped updating',
    html: emailWrap(`
      <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 8px">Your inventory feed needs attention</h1>
      <p style="color:#52525b;margin:0 0 16px">
        Hi ${dealer.name}, we haven't received an update from your inventory feed in over 48 hours
        (${dealer.detail}). Your existing listings are still live on GarageCherries, but any changes
        on your end — price updates, sold vehicles, new inventory — won't show up until this is fixed.
      </p>
      <p style="color:#52525b;margin:0 0 16px">
        Please check your feed connection, or reply to this email and we'll help you sort it out.
      </p>
      <p style="margin-top:24px;">
        <a href="https://www.garagecherries.com/dealer/dashboard?tab=settings" style="background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Check Feed Settings
        </a>
      </p>
    `),
  });
}

// GET /api/cron/dealer-feed-staleness
// Called daily by Vercel Cron. Flags any dealer whose feed hasn't produced a
// successful sync in 48+ hours, across all three feed protocols (push-based
// 'sftp_incoming', outbound-pull 'sftp', and 'https') -- previously this only
// covered 'sftp_incoming'. Emails the admin with the full list, and now also
// emails each affected dealer directly, since previously only the admin knew
// a dealer's inventory (possibly already sold elsewhere) had gone stale.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: dealers } = await admin
    .from('dealers')
    .select('id, name, email, feed_protocol, feed_sftp_provisioned_at, feed_sftp_last_received_at, feed_last_success_at')
    .or('feed_protocol.eq.sftp_incoming,feed_protocol.eq.sftp,feed_protocol.eq.https');

  const stale = findStale((dealers ?? []) as DealerRow[], Date.now());

  if (stale.length > 0) {
    const lines = stale.map(d => `${d.name} (${d.email}) [${d.protocol}] — ${d.detail}`);
    notifyAdmin('Dealer feeds gone stale', lines.join('<br/>'));

    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const dealer of stale) {
      try {
        await alertDealer(resend, dealer);
      } catch (err) {
        log.error('Failed to send feed-staleness alert to dealer', { dealerId: dealer.id, email: dealer.email, error: String(err) });
      }
    }

    log.warn('Dealer feed staleness check found stale feeds', { staleCount: stale.length });
  } else {
    log.info('Dealer feed staleness check passed', { checkedCount: dealers?.length ?? 0 });
  }
  await log.flush();

  return NextResponse.json({ ok: stale.length === 0, checkedCount: dealers?.length ?? 0, staleCount: stale.length });
}
