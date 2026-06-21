import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/email/price-drops — send price drop notifications to watchers
// Finds all watchlisted cars that had a price reduction in the past 7 days
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find cars that had a price drop this week
  const { data: priceChanges } = await admin
    .from('price_history')
    .select('car_id, price, changed_at')
    .gte('changed_at', oneWeekAgo)
    .order('changed_at', { ascending: false });

  if (!priceChanges || priceChanges.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No price changes this week' });
  }

  // For each changed car, find watchers
  const carIds = [...new Set(priceChanges.map((p: any) => p.car_id))];
  const { data: watchlists } = await admin
    .from('watchlists')
    .select('user_id, car_id')
    .in('car_id', carIds)
    .not('user_id', 'is', null);

  if (!watchlists || watchlists.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No watchers for changed cars' });
  }

  // Get current car data
  const { data: cars } = await admin
    .from('cars')
    .select('id, title, price, make, model, slug')
    .in('id', carIds);

  const carMap = Object.fromEntries((cars ?? []).map((c: any) => [c.id, c]));

  // Get user emails
  const userIds = [...new Set(watchlists.map((w: any) => w.user_id))];
  const { data: { users } } = await admin.auth.admin.listUsers();
  const userEmailMap = Object.fromEntries(
    (users ?? []).filter((u: any) => userIds.includes(u.id) && u.email).map((u: any) => [u.id, u.email])
  );

  // Group watchlists by user
  const byUser: Record<string, string[]> = {};
  for (const w of watchlists) {
    if (!byUser[w.user_id]) byUser[w.user_id] = [];
    byUser[w.user_id].push(w.car_id);
  }

  let sent = 0;
  for (const [userId, carIds] of Object.entries(byUser)) {
    const email = userEmailMap[userId];
    if (!email) continue;

    const userCars = carIds.map((id: string) => carMap[id]).filter(Boolean);
    if (userCars.length === 0) continue;

    const listHtml = userCars.map((car: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
          <a href="https://www.garagecherries.com/listings/${car.make?.toLowerCase()}/${car.model?.toLowerCase()}/${car.id}/${car.slug}"
             style="font-weight:700;color:#dc2626;text-decoration:none;">${car.title}</a>
          <br/>
          <span style="color:#16a34a;font-weight:700;font-size:14px;">Now $${Number(car.price ?? 0).toLocaleString()}</span>
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="font-size:22px;font-weight:800;color:#18181b;">Price Drops on Cars You're Watching</h1>
        <p style="color:#52525b;">Good news — ${userCars.length} car${userCars.length !== 1 ? 's' : ''} on your watchlist got a price reduction this week.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">${listHtml}</table>
        <p style="margin-top:24px;">
          <a href="https://www.garagecherries.com/account/watchlist" style="background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
            View My Watchlist
          </a>
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'GarageCherries <noreply@garagecherries.com>',
        to: email,
        subject: `Price drop on ${userCars.length} car${userCars.length !== 1 ? 's' : ''} you're watching`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send price drop email to ${email}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
