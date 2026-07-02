import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`offers:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: 'Too many offers. Please try again later.' }, { status: 429 });

  const { carId, carTitle, dealerId, amount, buyerName, buyerEmail, message } = await request.json();

  if (!carId || !amount || !buyerEmail) {
    return NextResponse.json({ error: 'carId, amount, and buyerEmail are required' }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: 'Offer amount must be greater than 0' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data: offer, error } = await admin.from('offers').insert({
    car_id: carId,
    car_title: carTitle,
    dealer_id: dealerId,
    buyer_id: user?.id ?? null,
    buyer_email: buyerEmail,
    buyer_name: buyerName ?? null,
    amount,
    message: message ?? null,
    status: 'pending',
  }).select().single();

  if (error) {
    console.error('Offer insert error:', error);
    return NextResponse.json({ error: 'Failed to save offer' }, { status: 500 });
  }

  // Fetch dealer email
  const { data: dealer } = await admin.from('dealers').select('email, name').eq('id', dealerId).single();
  const dealerEmail = dealer?.email;

  if (dealerEmail) {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'GarageCherries <offers@garagecherries.com>',
      to: dealerEmail,
      subject: `New offer on ${carTitle}: ${fmt(amount)}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#dc2626">New Offer Received</h2>
          <p>You've received an offer on <strong>${carTitle}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Offer Amount</td>
                <td style="padding:8px 0;font-weight:bold;font-size:20px;color:#111;border-bottom:1px solid #eee">${fmt(amount)}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Buyer Name</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee">${buyerName ?? 'Not provided'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Buyer Email</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee"><a href="mailto:${buyerEmail}">${buyerEmail}</a></td></tr>
            ${message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td>
                <td style="padding:8px 0">${message}</td></tr>` : ''}
          </table>
          <p>Reply directly to the buyer at <a href="mailto:${buyerEmail}">${buyerEmail}</a> to accept, counter, or decline.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px">GarageCherries — The Classic Car Marketplace</p>
        </div>
      `,
    }).catch(() => {});
  }

  // Confirm email to buyer
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'GarageCherries <offers@garagecherries.com>',
    to: buyerEmail,
    subject: `Your offer on ${carTitle} has been sent`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">Offer Submitted</h2>
        <p>Your offer of <strong>${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amount)}</strong> on <strong>${carTitle}</strong> has been sent to the dealer.</p>
        <p>The dealer will contact you directly at <strong>${buyerEmail}</strong> to respond.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#999;font-size:12px">GarageCherries — The Classic Car Marketplace</p>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ ok: true, offerId: offer.id });
}
