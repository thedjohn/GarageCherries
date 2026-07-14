import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/email/dealer-report');

// POST /api/email/dealer-report — send monthly performance report to all dealers
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get all dealers
  const { data: dealers } = await admin
    .from('dealers')
    .select('id, name, email')
    .not('email', 'is', null)
    .eq('report_opt_out', false);

  if (!dealers || dealers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No dealers found' });
  }

  let sent = 0;
  for (const dealer of dealers) {
    if (!dealer.email) continue;

    // Get their listings
    const { data: cars } = await admin
      .from('listings')
      .select('id, title, price, is_sold')
      .eq('seller_id', dealer.id);

    const activeCars = (cars ?? []).filter((c: any) => !c.is_sold);
    const soldThisMonth = (cars ?? []).filter((c: any) => c.is_sold);

    // Views this month — from listing_views, the table the dealer dashboard and
    // per-listing views feature actually read. The old `listings.views` column
    // is never incremented anywhere and was always reporting 0.
    const { data: viewRows } = await admin
      .from('listing_views')
      .select('listing_id')
      .eq('dealer_id', dealer.id)
      .gte('viewed_at', thirtyDaysAgo);
    const viewsByListing: Record<string, number> = {};
    (viewRows ?? []).forEach((r: any) => { viewsByListing[r.listing_id] = (viewsByListing[r.listing_id] ?? 0) + 1; });
    const totalViews = Object.values(viewsByListing).reduce((s, n) => s + n, 0);

    // Buyer inquiries this month — from conversations, the live buyer-contact
    // system (Message Seller). The old `inquiries` table has had no live writer
    // since that button switched to conversations/messages, so this was always 0.
    const listingIds = (cars ?? []).map((c: any) => c.id);
    let inquiryCount = 0;
    if (listingIds.length > 0) {
      const { count } = await admin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .in('listing_id', listingIds)
        .gte('created_at', thirtyDaysAgo);
      inquiryCount = count ?? 0;
    }

    // Top performing listings by views
    const topListings = [...activeCars]
      .map((c: any) => ({ ...c, views: viewsByListing[c.id] ?? 0 }))
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 3);

    const topHtml = topListings.map((car: any) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #f4f4f5;">
          <span style="font-weight:600;color:#18181b;">${car.title}</span>
          <span style="color:#71717a;font-size:13px;margin-left:8px;">${car.views.toLocaleString()} views</span>
        </td>
      </tr>
    `).join('');

    const html = emailWrap(`
        <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 8px">Your Monthly GarageCherries Report</h1>
        <p style="color:#52525b;margin:0 0 16px">Here's how your inventory performed over the last 30 days, ${dealer.name}.</p>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:24px 0;">
          <div style="background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:28px;font-weight:800;color:#18181b;margin:0;">${activeCars.length}</p>
            <p style="color:#71717a;font-size:13px;margin:4px 0 0;">Active Listings</p>
          </div>
          <div style="background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:28px;font-weight:800;color:#18181b;margin:0;">${totalViews.toLocaleString()}</p>
            <p style="color:#71717a;font-size:13px;margin:4px 0 0;">Total Views</p>
          </div>
          <div style="background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:28px;font-weight:800;color:#18181b;margin:0;">${inquiryCount}</p>
            <p style="color:#71717a;font-size:13px;margin:4px 0 0;">Buyer Inquiries</p>
          </div>
        </div>

        ${soldThisMonth.length > 0 ? `
        <p style="color:#16a34a;font-weight:700;">
          Congratulations — you marked ${soldThisMonth.length} vehicle${soldThisMonth.length !== 1 ? 's' : ''} sold this month!
        </p>
        ` : ''}

        ${topListings.length > 0 ? `
        <h2 style="font-size:16px;font-weight:700;color:#18181b;margin-top:24px;">Top Listings by Views</h2>
        <table style="width:100%;border-collapse:collapse;">${topHtml}</table>
        ` : ''}

        <p style="margin-top:24px;">
          <a href="https://www.garagecherries.com/dealer/dashboard" style="background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
            View Your Dashboard
          </a>
        </p>

        <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">
          GarageCherries · Monthly Dealer Performance Report<br/>
          <a href="https://www.garagecherries.com/unsubscribe/dealer-report?uid=${dealer.id}" style="color:#a1a1aa;">Unsubscribe from monthly reports</a>
        </p>
    `);

    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'GarageCherries <noreply@garagecherries.com>',
        to: dealer.email,
        subject: `Your GarageCherries monthly report — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        html,
      });
      sent++;
    } catch (err) {
      log.error('Failed to send dealer report', { dealerId: dealer.id, email: dealer.email, error: String(err) });
    }
  }

  log.info('Monthly dealer reports sent', { sent, total: dealers.length });
  return NextResponse.json({ ok: true, sent, total: dealers.length });
}
