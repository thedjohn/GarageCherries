import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { carId, message } = await request.json();
  if (!carId || !message?.trim()) return NextResponse.json({ error: 'carId and message required' }, { status: 400 });

  const admin = createAdminClient();

  // Verify this car belongs to the authenticated dealer
  const { data: dealer } = await admin.from('dealers').select('id, name').or(`id.eq.${user.id},email.eq.${user.email}`).single();
  if (!dealer) return NextResponse.json({ error: 'Dealer not found' }, { status: 403 });

  const { data: car } = await admin.from('cars').select('id, title, slug, make, model').eq('id', carId).eq('seller_id', dealer.id).single();
  if (!car) return NextResponse.json({ error: 'Car not found or not yours' }, { status: 403 });

  // Find eligible watchers: opted in, not yet messaged, not blocked
  const { data: watchers } = await admin
    .from('watchlists')
    .select('id, user_id')
    .eq('car_id', carId)
    .eq('allow_dealer_contact', true)
    .is('dealer_messaged_at', null)
    .eq('dealer_contact_blocked', false);

  if (!watchers?.length) return NextResponse.json({ sent: 0 });

  const origin = request.headers.get('origin') ?? 'https://garagecherries.com';
  const listingUrl = `${origin}/listings/${car.make.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${car.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${car.id}/${car.slug}`;

  let sent = 0;
  for (const watcher of watchers) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(watcher.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const unsubUrl = `${origin}/unsubscribe?id=${watcher.id}`;

      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from:    'GarageCherries <notifications@garagecherries.com>',
        to:      email,
        subject: `Message from the seller — ${car.title}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
            <div style="background:#18181b;padding:20px 24px;border-radius:12px 12px 0 0">
              <span style="font-size:20px;font-weight:800;color:#fff">
                Garage<span style="color:#ef4444">Cherries</span>
              </span>
            </div>
            <div style="background:#fff;border:1px solid #e4e4e7;border-top:none;padding:32px 24px;border-radius:0 0 12px 12px">
              <p style="font-size:13px;color:#71717a;margin:0 0 20px">
                You're receiving this because you're watching <strong>${car.title}</strong> on GarageCherries
                and allowed the seller to contact you.
              </p>

              <h2 style="font-size:18px;font-weight:700;margin:0 0 4px">${car.title}</h2>
              <p style="font-size:13px;color:#71717a;margin:0 0 20px">Message from <strong>${dealer.name}</strong></p>

              <div style="background:#f4f4f5;border-radius:10px;padding:16px 20px;margin-bottom:24px">
                <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap">${message.trim()}</p>
              </div>

              <a href="${listingUrl}" style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none">
                View Listing →
              </a>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0 20px">
              <p style="font-size:12px;color:#a1a1aa;margin:0">
                This is a one-time message. The seller cannot see your email address.<br>
                <a href="${unsubUrl}" style="color:#71717a">Stop messages from ${dealer.name}</a>
              </p>
            </div>
          </div>`,
      });

      // Mark as messaged — prevents any future send
      await admin.from('watchlists').update({ dealer_messaged_at: new Date().toISOString() }).eq('id', watcher.id);
      sent++;
    } catch {
      // skip this watcher, continue with others
    }
  }

  return NextResponse.json({ sent });
}
