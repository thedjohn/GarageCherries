import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';

const resend = new Resend(process.env.RESEND_API_KEY);
const log = createLogger('cron/listing-comments-digest');

// GET /api/cron/listing-comments-digest
// Called hourly by Vercel Cron (same cadence as dealer-feed-sync). Batches
// new top-level listing questions into one digest email per listing per run,
// so a viral listing can't flood the seller's inbox -- decided with Derek
// after the plan's first draft would have emailed on every single comment.
// A seller's reply to a specific question still emails that one buyer
// immediately (app/api/listings/[id]/comments/route.ts) -- only new
// top-level questions have the burst-risk this batches against.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pending, error } = await admin
    .from('listing_comments')
    .select('id, listing_id, author_name, body, listings(title, seller_id)')
    .is('parent_id', null)
    .eq('seller_notified', false)
    .order('created_at', { ascending: true });

  if (error) {
    log.error('Failed to fetch pending comments', new Error(error.message));
    void log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!pending?.length) return NextResponse.json({ notified: 0, listings: 0 });

  const byListing = new Map<string, { title: string; sellerId: string | null; comments: typeof pending }>();
  for (const c of pending) {
    const listing = (c as any).listings;
    if (!listing?.seller_id) continue;
    const existing = byListing.get(c.listing_id);
    if (existing) existing.comments.push(c);
    else byListing.set(c.listing_id, { title: listing.title, sellerId: listing.seller_id, comments: [c] });
  }

  let notifiedListings = 0;
  let notifiedComments = 0;

  for (const [listingId, { title, sellerId, comments }] of byListing) {
    // Same seller-email fallback chain as app/api/conversations/route.ts.
    let sellerEmail = '';
    const { data: { user: sellerUser } } = await admin.auth.admin.getUserById(sellerId!);
    if (sellerUser?.email) sellerEmail = sellerUser.email;
    const { data: dealer } = await admin.from('dealers').select('notification_email').eq('id', sellerId!).maybeSingle();
    if (dealer?.notification_email) sellerEmail = dealer.notification_email;
    if (!sellerEmail) continue;

    const listingUrl = `https://www.garagecherries.com/listings/${listingId}`;
    const itemsHtml = comments.map(c => `
      <div style="background:#f4f4f5;border-radius:10px;padding:14px 18px;margin-bottom:10px">
        <p style="font-size:13px;font-weight:700;color:#18181b;margin:0 0 4px">${c.author_name}</p>
        <p style="font-size:14px;color:#18181b;margin:0">${c.body}</p>
      </div>`).join('');

    try {
      await resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: sellerEmail,
        subject: `You have ${comments.length} new question${comments.length > 1 ? 's' : ''} on your ${title}`,
        html: emailWrap(`
          <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px">New questions on your listing</h1>
          <p style="color:#71717a;font-size:14px;margin:0 0 16px">${comments.length} new question${comments.length > 1 ? 's' : ''} on <strong style="color:#18181b">${title}</strong>:</p>
          ${itemsHtml}
          <a href="${listingUrl}" style="display:block;text-align:center;background:#ef4444;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin:24px 0" >Reply on the Listing →</a>
          <p style="color:#a1a1aa;font-size:12px;margin:0">You get at most one of these emails per listing per hour, even if many people comment.</p>
        `),
      });
      await admin.from('listing_comments').update({ seller_notified: true }).in('id', comments.map(c => c.id));
      notifiedListings++;
      notifiedComments += comments.length;
    } catch (err) {
      log.error('Digest email failed', new Error(String(err)), { listingId });
    }
  }

  log.info('Listing comments digest run complete', { notifiedListings, notifiedComments });
  void log.flush();
  return NextResponse.json({ notified: notifiedComments, listings: notifiedListings });
}
