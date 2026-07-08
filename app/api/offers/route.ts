import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { emailWrap } from '@/lib/emailBranding';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`offers:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: 'Too many offers. Please try again later.' }, { status: 429 });

  const { carId, carTitle, dealerId, amount, buyerName, buyerEmail, message } = await request.json();

  if (!carId || !amount || !buyerEmail) {
    return NextResponse.json({ error: 'carId, amount, and buyerEmail are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
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
      html: emailWrap(`
          <h2 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px">New Offer Received</h2>
          <p style="color:#71717a;font-size:14px;margin:0 0 20px">You've received an offer on <strong style="color:#18181b">${carTitle}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
            <tr><td style="padding:8px 0;color:#71717a;font-size:14px;border-bottom:1px solid #f4f4f5">Offer Amount</td>
                <td style="padding:8px 0;font-weight:800;font-size:20px;color:#18181b;border-bottom:1px solid #f4f4f5">${fmt(amount)}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:14px;border-bottom:1px solid #f4f4f5">Buyer Name</td>
                <td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f4f4f5">${buyerName ?? 'Not provided'}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:14px;border-bottom:1px solid #f4f4f5">Buyer Email</td>
                <td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f4f4f5"><a href="mailto:${buyerEmail}" style="color:#ef4444">${buyerEmail}</a></td></tr>
            ${message ? `<tr><td style="padding:8px 0;color:#71717a;font-size:14px;vertical-align:top">Message</td>
                <td style="padding:8px 0;font-size:14px">${message}</td></tr>` : ''}
          </table>
          <a href="mailto:${buyerEmail}" style="display:inline-block;background:#ef4444;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px">Reply to Buyer</a>
          <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0">Reply directly to <a href="mailto:${buyerEmail}" style="color:#71717a">${buyerEmail}</a> to accept, counter, or decline.</p>
      `),
    }).catch(() => {});
  }

  // Confirm email to buyer
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'GarageCherries <offers@garagecherries.com>',
    to: buyerEmail,
    subject: `Your offer on ${carTitle} has been sent`,
    html: emailWrap(`
        <h2 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px">Offer Submitted</h2>
        <p style="color:#71717a;font-size:14px;margin:0 0 16px">Your offer of <strong style="color:#18181b">${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amount)}</strong> on <strong style="color:#18181b">${carTitle}</strong> has been sent to the dealer.</p>
        <p style="color:#71717a;font-size:14px;margin:0">The dealer will contact you directly at <strong style="color:#18181b">${buyerEmail}</strong> to respond.</p>
    `),
  }).catch(() => {});

  return NextResponse.json({ ok: true, offerId: offer.id });
}
