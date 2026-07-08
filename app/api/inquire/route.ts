import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/verifyTurnstile';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { emailHeader } from '@/lib/emailBranding';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/inquire');

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_EMAIL = process.env.INQUIRY_FALLBACK_EMAIL;
if (!FALLBACK_EMAIL) {
  console.error('INQUIRY_FALLBACK_EMAIL env var is not set');
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed, firstBlock } = rateLimit(`inquire:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    if (firstBlock) notifyAdmin('Rate limit hit: inquire', `IP <strong>${ip}</strong> exceeded the inquiry limit (10/hour).`);
    return NextResponse.json({ error: 'Too many inquiries. Please try again later.' }, { status: 429 });
  }

  const { carId, carTitle, buyerName, buyerEmail, buyerPhone, message, captchaToken } = await request.json();

  if (!await verifyTurnstile(captchaToken ?? null)) {
    return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
  }

  if (!buyerName || !buyerEmail || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up seller email and dealer_id server-side
  let sellerEmail: string | null = null;
  let sellerName = 'the seller';
  let dealerId = '';

  try {
    const { data: car } = await supabase
      .from('listings')
      .select('seller_id, seller_name, seller_email')
      .eq('id', carId)
      .single();

    if (car?.seller_id) {
      dealerId = car.seller_id;
      const { data: dealer } = await supabase
        .from('dealers')
        .select('email, name')
        .eq('id', car.seller_id)
        .single();

      if (dealer?.email) {
        sellerEmail = dealer.email;
        sellerName = dealer.name ?? sellerName;
      } else if (car.seller_email) {
        sellerEmail = car.seller_email;
        sellerName = car.seller_name ?? sellerName;
      }
    }
  } catch {
    // Fall through to fallback
  }

  // Use fallback only if seller email couldn't be resolved
  if (!sellerEmail) {
    if (!FALLBACK_EMAIL) {
      return NextResponse.json({ error: 'Unable to route inquiry — seller email not found and no fallback configured.' }, { status: 500 });
    }
    sellerEmail = FALLBACK_EMAIL;
  }

  // Store inquiry in DB
  try {
    await supabase.from('inquiries').insert({
      listing_id: carId,
      dealer_id: dealerId || 'unknown',
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone || null,
      message,
    });
  } catch (e) {
    log.error('Failed to store inquiry in DB', { carId, error: String(e) });
  }

  // Send email
  try {
    await resend.emails.send({
      from: 'GarageCherries <noreply@garagecherries.com>',
      to: sellerEmail,
      replyTo: buyerEmail,
      subject: `New inquiry: ${carTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          ${emailHeader}
          <div style="background: white; border: 1px solid #f4f4f5; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
            <h1 style="font-size: 20px; font-weight: 800; color: #18181b; margin: 0 0 8px;">New buyer inquiry</h1>
            <p style="color: #71717a; font-size: 14px; margin: 0 0 24px;">
              Someone is interested in: <strong style="color: #18181b;">${carTitle}</strong>
            </p>
            <div style="background: #fafafa; border: 1px solid #f4f4f5; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa;">Buyer</p>
              <p style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #18181b;">${buyerName}</p>
              <p style="margin: 0 0 4px; font-size: 14px;"><a href="mailto:${buyerEmail}" style="color: #ef4444;">${buyerEmail}</a></p>
              ${buyerPhone ? `<p style="margin: 0; font-size: 14px;"><a href="tel:${buyerPhone}" style="color: #ef4444;">${buyerPhone}</a></p>` : ''}
            </div>
            <div style="background: #fafafa; border: 1px solid #f4f4f5; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa;">Message</p>
              <p style="margin: 0; font-size: 15px; color: #18181b; line-height: 1.6;">${message}</p>
            </div>
            <a href="mailto:${buyerEmail}" style="display: inline-block; background: #ef4444; color: white; font-weight: 700; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 14px;">
              Reply to ${buyerName}
            </a>
            <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa;">
              Sent via GarageCherries. Reply to this email to respond directly to the buyer.
            </p>
          </div>
        </div>
      `,
    });

    log.info('Inquiry sent', { carId, carTitle, sellerEmail, usedFallback: sellerEmail === FALLBACK_EMAIL });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    log.error('Failed to send inquiry email', { carId, carTitle, error: e.message });
    return NextResponse.json({ error: e.message ?? 'Failed to send email' }, { status: 500 });
  }
}
