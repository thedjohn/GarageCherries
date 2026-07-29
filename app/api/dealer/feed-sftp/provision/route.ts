import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('dealer/feed-sftp/provision');

// Separate, dedicated route rather than the generic /api/dealer/settings --
// that route writes any field name in the POST body straight to the dealers
// row with no allowlisting, which is fine for dealer-editable preferences
// but not safe for server-generated SFTP credentials a dealer must never be
// able to set themselves. Ownership check mirrors /api/dealer/settings/route.ts.
async function requireOwnDealer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: dealer } = await admin.from('dealers').select('id').eq('id', user.id).single();
  if (!dealer) return { error: NextResponse.json({ error: 'Dealer not found' }, { status: 403 }) };

  return { admin, dealer };
}

export async function POST(_request: NextRequest) {
  const ctx = await requireOwnDealer();
  if ('error' in ctx) return ctx.error;
  const { admin, dealer } = ctx;

  const vpsUrl = process.env.VPS_URL;
  const bridgeSecret = process.env.VPS_SFTP_BRIDGE_SECRET;
  if (!vpsUrl || !bridgeSecret) {
    return NextResponse.json({ error: 'SFTP feed intake is not configured' }, { status: 503 });
  }

  const bridgeRes = await fetch(`${vpsUrl}/dealer-feed/dealers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bridgeSecret}` },
    body: JSON.stringify({ dealerId: dealer.id }),
  });
  if (!bridgeRes.ok) {
    const text = await bridgeRes.text().catch(() => '');
    log.error('SFTP provision failed', new Error(`HTTP ${bridgeRes.status} ${text}`), { dealerId: dealer.id });
    await log.flush();
    return NextResponse.json({ error: 'Failed to provision SFTP access' }, { status: 502 });
  }
  const { username, password, host, port } = await bridgeRes.json();

  const provisionedAt = new Date().toISOString();
  const { error } = await admin.from('dealers').update({
    feed_protocol: 'sftp_incoming',
    feed_sftp_username: username,
    feed_sftp_provisioned_at: provisionedAt,
  }).eq('id', dealer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  log.info('Dealer SFTP access provisioned', { dealerId: dealer.id });
  await log.flush();

  // Password is only ever returned here, at creation time -- it's never
  // stored in our database (SFTPGo owns it), so this is the one chance the
  // dealer has to see it before it's shown again only via re-provisioning.
  return NextResponse.json({ username, password, host, port });
}

export async function DELETE(_request: NextRequest) {
  const ctx = await requireOwnDealer();
  if ('error' in ctx) return ctx.error;
  const { admin, dealer } = ctx;

  const vpsUrl = process.env.VPS_URL;
  const bridgeSecret = process.env.VPS_SFTP_BRIDGE_SECRET;
  if (vpsUrl && bridgeSecret) {
    const bridgeRes = await fetch(`${vpsUrl}/dealer-feed/dealers/${encodeURIComponent(dealer.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bridgeSecret}` },
    });
    if (!bridgeRes.ok) {
      const text = await bridgeRes.text().catch(() => '');
      log.error('SFTP deprovision failed', new Error(`HTTP ${bridgeRes.status} ${text}`), { dealerId: dealer.id });
      await log.flush();
      return NextResponse.json({ error: 'Failed to remove SFTP access' }, { status: 502 });
    }
  }

  const { error } = await admin.from('dealers').update({
    feed_protocol: null,
    feed_sftp_username: null,
    feed_sftp_provisioned_at: null,
    feed_sftp_last_received_at: null,
  }).eq('id', dealer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  log.info('Dealer SFTP access deprovisioned', { dealerId: dealer.id });
  await log.flush();

  return NextResponse.json({ ok: true });
}
