import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

function toSegment(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export async function POST(request: NextRequest) {
  // Rate limit — prevent spamming price-drop emails
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`notify-watchers:${ip}`, 30, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ sent: 0 }, { status: 429 });

  // Require authenticated user who owns the listing
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { carId, oldPrice, newPrice } = await request.json();

  // Only notify on price drops
  if (!carId || !oldPrice || !newPrice || newPrice >= oldPrice) {
    return NextResponse.json({ sent: 0 });
  }

  const supabase = createAdminClient();

  // Verify the requesting user owns this listing
  const { data: listing } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', carId)
    .single();
  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get car details for the email
  const { data: car } = await supabase
    .from('listings')
    .select('title, make, model, slug')
    .eq('id', carId)
    .single();

  if (!car) return NextResponse.json({ sent: 0 });

  // Get all watchers
  const { data: watchers } = await supabase
    .from('watchlists')
    .select('user_id')
    .eq('car_id', carId);

  if (!watchers?.length) return NextResponse.json({ sent: 0 });

  const listingUrl = `https://www.garagecherries.com/listings/${toSegment(car.make)}/${toSegment(car.model)}/${carId}/${car.slug}`;
  const drop = oldPrice - newPrice;

  let sent = 0;
  for (const watcher of watchers) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(watcher.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      // Skip users who have opted out of price drop notifications
      if (userData?.user?.user_metadata?.price_drop_opt_out) continue;

      const unsubscribeUrl = `https://www.garagecherries.com/unsubscribe/price-drops?uid=${watcher.user_id}`;

      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'GarageCherries Alerts <noreply@garagecherries.com>',
        to: email,
        subject: `Price Drop: ${car.title} is now ${fmt(newPrice)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #18181b; padding: 24px; border-radius: 12px 12px 0 0;">
              <p style="color: #ef4444; font-size: 22px; font-weight: 900; margin: 0;">🍒 GarageCherries</p>
            </div>
            <div style="background: white; border: 1px solid #f4f4f5; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
              <div style="display: inline-block; background: #dcfce7; color: #15803d; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;">
                ▼ Price Drop — ${fmt(drop)} less
              </div>
              <h1 style="font-size: 20px; font-weight: 800; color: #18181b; margin: 0 0 8px;">${car.title}</h1>
              <p style="color: #71717a; margin: 0 0 24px; font-size: 14px;">A listing on your watchlist just dropped in price.</p>
              <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div style="flex: 1; text-align: center; background: #fafafa; border: 1px solid #f4f4f5; border-radius: 10px; padding: 16px;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-bottom: 4px;">Was</div>
                  <div style="font-size: 20px; font-weight: 800; color: #a1a1aa; text-decoration: line-through;">${fmt(oldPrice)}</div>
                </div>
                <div style="flex: 1; text-align: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #15803d; margin-bottom: 4px;">Now</div>
                  <div style="font-size: 24px; font-weight: 900; color: #16a34a;">${fmt(newPrice)}</div>
                </div>
              </div>
              <a href="${listingUrl}" style="display: block; text-align: center; background: #ef4444; color: white; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-size: 15px;">
                View Listing →
              </a>
              <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                You're watching this listing on GarageCherries.<br/>
                <a href="${unsubscribeUrl}" style="color: #71717a;">Unsubscribe from price drop notifications</a>
              </p>
            </div>
          </div>
        `,
      });
      sent++;
    } catch (e) {
      console.error(`Failed to notify watcher ${watcher.user_id}:`, e);
    }
  }

  return NextResponse.json({ sent });
}
