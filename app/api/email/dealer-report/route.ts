import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    .not('email', 'is', null);

  if (!dealers || dealers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No dealers found' });
  }

  let sent = 0;
  for (const dealer of dealers) {
    if (!dealer.email) continue;

    // Get their listings
    const { data: cars } = await admin
      .from('cars')
      .select('id, title, price, views, is_sold')
      .eq('seller_id', dealer.id);

    const activeCars = (cars ?? []).filter((c: any) => !c.is_sold);
    const soldThisMonth = (cars ?? []).filter((c: any) => c.is_sold);
    const totalViews = activeCars.reduce((s: number, c: any) => s + (c.views ?? 0), 0);

    // Get inquiries this month
    const { count: inquiryCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('dealer_id', dealer.id)
      .gte('created_at', thirtyDaysAgo);

    // Top performing listings by views
    const topListings = [...activeCars]
      .sort((a: any, b: any) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 3);

    const topHtml = topListings.map((car: any) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #f4f4f5;">
          <span style="font-weight:600;color:#18181b;">${car.title}</span>
          <span style="color:#71717a;font-size:13px;margin-left:8px;">${(car.views ?? 0).toLocaleString()} views</span>
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="font-size:22px;font-weight:800;color:#18181b;">Your Monthly GarageCherries Report</h1>
        <p style="color:#52525b;">Here's how your inventory performed over the last 30 days, ${dealer.name}.</p>

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
            <p style="font-size:28px;font-weight:800;color:#18181b;margin:0;">${inquiryCount ?? 0}</p>
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
          GarageCherries · Monthly Dealer Performance Report
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'GarageCherries <noreply@garagecherries.com>',
        to: dealer.email,
        subject: `Your GarageCherries monthly report — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send dealer report to ${dealer.email}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent, total: dealers.length });
}
