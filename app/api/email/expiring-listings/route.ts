import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// POST /api/email/expiring-listings — send renewal reminders for listings expiring within 3 days
// Intended to run daily via cron or manually from /admin/email
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  // Find approved, unsold, non-feed-managed listings expiring within 3 days
  // that haven't already had a reminder sent
  const { data: listings } = await admin
    .from('listings')
    .select('id, title, slug, make, model, seller_id, seller_email, seller_name, expires_at')
    .eq('status', 'approved')
    .eq('is_sold', false)
    .eq('is_feed_managed', false)
    .lte('expires_at', in3Days)
    .gte('expires_at', now.toISOString())
    .is('renewal_reminder_sent_at', null);

  if (!listings || listings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No listings expiring within 3 days' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;

  for (const listing of listings) {
    // Resolve seller email — prefer auth user email for authenticated sellers
    let sellerEmail = listing.seller_email;
    if (listing.seller_id) {
      const { data: { user } } = await admin.auth.admin.getUserById(listing.seller_id);
      if (user?.email) sellerEmail = user.email;
    }
    if (!sellerEmail) continue;

    const expiresAt = new Date(listing.expires_at);
    const daysLeft = Math.max(1, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const renewUrl = `https://www.garagecherries.com/account?tab=listings`;
    const listingUrl = `https://www.garagecherries.com/listings/${listing.make.toLowerCase().replace(/\s+/g, '-')}/${listing.model.toLowerCase().replace(/\s+/g, '-')}/${listing.id}/${listing.slug}`;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#18181b;padding:24px;border-radius:12px 12px 0 0;">
          <p style="color:#ef4444;font-size:22px;font-weight:900;margin:0;">🍒 GarageCherries</p>
        </div>
        <div style="background:white;border:1px solid #f4f4f5;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
          <div style="display:inline-block;background:#fef3c7;color:#92400e;font-weight:700;font-size:13px;padding:4px 12px;border-radius:20px;margin-bottom:16px;">
            ⏰ Expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
          </div>
          <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px;">Your listing is about to expire</h1>
          <p style="color:#71717a;font-size:14px;margin:0 0 24px;">
            <a href="${listingUrl}" style="color:#dc2626;font-weight:600;text-decoration:none;">${listing.title}</a>
            will be removed from search results on ${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            Renew it to keep it visible to buyers.
          </p>
          <a href="${renewUrl}" style="display:block;text-align:center;background:#ef4444;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:16px;">
            Renew My Listing →
          </a>
          <p style="color:#71717a;font-size:13px;text-align:center;margin:0;">
            Renewing is free and extends your listing for another 30 days.
          </p>
          <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">
            GarageCherries · Listing Renewal Reminder
          </p>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: sellerEmail,
        subject: `Your listing "${listing.title}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — renew now`,
        html,
      });

      // Mark reminder as sent so we don't email again
      await admin
        .from('listings')
        .update({ renewal_reminder_sent_at: now.toISOString() })
        .eq('id', listing.id);

      sent++;
    } catch (err) {
      console.error(`Failed to send renewal reminder for listing ${listing.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent, total: listings.length });
}
