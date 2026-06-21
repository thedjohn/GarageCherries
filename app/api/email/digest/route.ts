import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// POST /api/email/digest — manually trigger fresh listings digest
// Sends a summary of new listings in the past 7 days to subscribed users
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get listings from the past 7 days
  const { data: cars } = await admin
    .from('cars')
    .select('id, title, make, model, year, price, slug, images, condition, location, state')
    .gte('listed_at', oneWeekAgo)
    .eq('is_sold', false)
    .order('listed_at', { ascending: false })
    .limit(10);

  if (!cars || cars.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No new listings this week' });
  }

  // Get subscriber list — users who have opted in for the digest
  // For now, use the watchlists table to find active users; in future, add an email_preferences table
  const { data: subscribers } = await admin
    .from('watchlists')
    .select('user_id')
    .not('user_id', 'is', null);

  const uniqueUserIds = [...new Set((subscribers ?? []).map((s: any) => s.user_id))];

  // Resolve emails for each user via auth.users (admin only)
  const { data: { users } } = await admin.auth.admin.listUsers();
  const subscriberEmails = (users ?? [])
    .filter((u: any) => uniqueUserIds.includes(u.id) && u.email)
    .map((u: any) => u.email as string);

  if (subscriberEmails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No subscribers found' });
  }

  const listingsHtml = (cars ?? []).map((car: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
        <a href="https://www.garagecherries.com/listings/${car.make?.toLowerCase()}/${car.model?.toLowerCase()}/${car.id}/${car.slug}"
           style="font-weight:700;color:#dc2626;text-decoration:none;">${car.title}</a>
        <br/>
        <span style="color:#71717a;font-size:13px;">${car.condition} · ${car.location ?? ''}${car.state ? `, ${car.state}` : ''} · $${Number(car.price ?? 0).toLocaleString()}</span>
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h1 style="font-size:24px;font-weight:800;color:#18181b;">Fresh Listings This Week</h1>
      <p style="color:#52525b;">Here are the ${cars.length} newest classic cars added to GarageCherries in the last 7 days.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${listingsHtml}</table>
      <p style="margin-top:24px;">
        <a href="https://www.garagecherries.com/listings" style="background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Browse All Listings
        </a>
      </p>
      <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">
        You're receiving this because you're watching listings on GarageCherries.
      </p>
    </div>
  `;

  let sent = 0;
  for (const email of subscriberEmails) {
    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'GarageCherries <noreply@garagecherries.com>',
        to: email,
        subject: `🚗 ${cars.length} new classic cars this week — GarageCherries`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send digest to ${email}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent, total: subscriberEmails.length });
}
