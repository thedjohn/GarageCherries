import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// POST /api/cars/sold — dealer marks a listing as sold
export async function POST(request: NextRequest) {
  const { carId, soldPrice } = await request.json();
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const admin = createAdminClient();
  const { data: car } = await admin.from('listings').select('id, seller_id, title').eq('id', carId).single();
  if (!car || car.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to update this listing' }, { status: 403 });
  }

  const { error } = await admin.from('listings').update({
    is_sold: true,
    sold_at: new Date().toISOString(),
    sold_price: soldPrice ?? null,
  }).eq('id', carId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify watchlist users that this car has sold (fire-and-forget)
  void (async () => {
    const { data: watchers } = await admin
      .from('watchlists')
      .select('user_id')
      .eq('car_id', carId);
    if (!watchers?.length) return;

    const userIds = watchers.map(w => w.user_id);
    const { data: { users } } = await admin.auth.admin.listUsers();
    const emails = users
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => u.email!);
    if (!emails.length) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await Promise.allSettled(emails.map(email =>
      resend.emails.send({
        from: 'GarageCherries <noreply@garagecherries.com>',
        to: email,
        subject: `${car.title} has sold`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <p style="color:#ef4444;font-weight:900;font-size:18px;margin:0 0 16px;">🍒 GarageCherries</p>
            <h1 style="font-size:20px;font-weight:800;color:#18181b;">A car on your watchlist has sold</h1>
            <p style="color:#52525b;"><strong>${car.title}</strong> has been marked as sold.</p>
            <p style="color:#52525b;">Browse similar listings on GarageCherries to find your next vehicle.</p>
            <p style="margin-top:24px;">
              <a href="https://www.garagecherries.com/listings"
                 style="background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
                Browse Listings
              </a>
            </p>
          </div>
        `,
      })
    ));
  })();

  return NextResponse.json({ ok: true });
}
