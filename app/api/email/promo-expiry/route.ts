import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// POST /api/email/promo-expiry
// Emails all promo users (individual sellers, dealers, advertisers) warning
// that their free period ends October 31, 2026.
// Idempotent — each recipient is only emailed once (tracked via promo_expiry_notified_at).
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toISOString();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  // ── 1. Individual sellers / buyers with promo_expires_at set ────────────────
  const { data: promoProfiles } = await admin
    .from('profiles')
    .select('id, full_name, promo_expires_at, promo_expiry_notified_at')
    .not('promo_expires_at', 'is', null)
    .is('promo_expiry_notified_at', null);

  for (const profile of promoProfiles ?? []) {
    const { data: { user } } = await admin.auth.admin.getUserById(profile.id);
    if (!user?.email) { skipped++; continue; }

    const html = promoExpiryHtml({
      name: profile.full_name ?? 'there',
      userType: 'seller',
      ctaUrl: 'https://www.garagecherries.com/sell',
      ctaLabel: 'Post a Listing Before It Expires',
    });

    try {
      await resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: user.email,
        subject: 'Your free listing period ends October 31 — here\'s what\'s next',
        html,
      });
      await admin.from('profiles').update({ promo_expiry_notified_at: now }).eq('id', profile.id);
      sent++;
    } catch (err) {
      errors.push(`profile ${profile.id}: ${String(err)}`);
    }
  }

  // ── 2. Dealers with beta_expires_at = 2026-10-31 (promo dealers) ────────────
  const { data: promoDealers } = await admin
    .from('dealers')
    .select('id, name, email, beta_expires_at, promo_expiry_notified_at')
    .eq('beta_expires_at', '2026-10-31')
    .is('promo_expiry_notified_at', null);

  for (const dealer of promoDealers ?? []) {
    const email = dealer.email;
    if (!email) { skipped++; continue; }

    const html = promoExpiryHtml({
      name: dealer.name,
      userType: 'dealer',
      ctaUrl: 'https://www.garagecherries.com/pricing',
      ctaLabel: 'View Dealer Plans',
    });

    try {
      await resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: email,
        subject: 'Your free dealer plan ends October 31 — here\'s what\'s next',
        html,
      });
      await admin.from('dealers').update({ promo_expiry_notified_at: now }).eq('id', dealer.id);
      sent++;
    } catch (err) {
      errors.push(`dealer ${dealer.id}: ${String(err)}`);
    }
  }

  // ── 3. Advertisers with trial ending around Oct 31 ───────────────────────────
  const oct31 = '2026-11-01T00:00:00Z';
  const oct17 = '2026-10-17T00:00:00Z';
  const { data: promoAdvertisers } = await admin
    .from('advertisers')
    .select('id, business_name, email, trial_ends_at, promo_expiry_notified_at')
    .lte('trial_ends_at', oct31)
    .gte('trial_ends_at', oct17)
    .is('promo_expiry_notified_at', null);

  for (const advertiser of promoAdvertisers ?? []) {
    const email = advertiser.email;
    if (!email) { skipped++; continue; }

    const html = promoExpiryHtml({
      name: advertiser.business_name,
      userType: 'advertiser',
      ctaUrl: 'https://www.garagecherries.com/pricing',
      ctaLabel: 'View Advertising Plans',
    });

    try {
      await resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: email,
        subject: 'Your free advertising trial ends October 31 — here\'s what\'s next',
        html,
      });
      await admin.from('advertisers').update({ promo_expiry_notified_at: now }).eq('id', advertiser.id);
      sent++;
    } catch (err) {
      errors.push(`advertiser ${advertiser.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    errors: errors.length ? errors : undefined,
  });
}

// ── Email template ─────────────────────────────────────────────────────────────

function promoExpiryHtml({
  name,
  userType,
  ctaUrl,
  ctaLabel,
}: {
  name: string;
  userType: 'seller' | 'dealer' | 'advertiser';
  ctaUrl: string;
  ctaLabel: string;
}) {
  const bodyByType: Record<typeof userType, string> = {
    seller: `
      <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">
        As part of our 250th birthday celebration, you've had <strong>free access to post listings</strong>
        on GarageCherries. That promotion ends on <strong>October 31, 2026</strong>.
      </p>
      <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        After that date, listing fees will apply. We'll share pricing details soon —
        but in the meantime, any active listings will remain live and you can continue
        to relist your car at no charge until the deadline.
      </p>
    `,
    dealer: `
      <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">
        As part of our 250th birthday celebration, your dealership has had
        <strong>free access to GarageCherries</strong> — unlimited listings, buyer inquiries,
        and your dealer profile page. That promotion ends on <strong>October 31, 2026</strong>.
      </p>
      <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        We're finalizing paid dealer plans and will be in touch with details before the cutoff.
        In the meantime, keep listing — your inventory stays live and active.
      </p>
    `,
    advertiser: `
      <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">
        As part of our 250th birthday celebration, your business has been advertising
        on GarageCherries for free. That promotion ends on <strong>October 31, 2026</strong>.
      </p>
      <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        We're finalizing advertising plans and will share full pricing before the cutoff.
        Your ads will continue running until then at no charge.
      </p>
    `,
  };

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#18181b;padding:24px 28px;border-radius:12px 12px 0 0;">
        <p style="color:#ef4444;font-size:22px;font-weight:900;margin:0;">🍒 GarageCherries</p>
      </div>
      <div style="background:white;border:1px solid #f4f4f5;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
        <div style="display:inline-block;background:#fef3c7;color:#92400e;font-weight:700;font-size:13px;padding:4px 14px;border-radius:20px;margin-bottom:20px;">
          🇺🇸 250th Birthday Promo — Ending Soon
        </div>
        <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 8px;">
          Hey ${name}, your free period ends October 31
        </h1>
        ${bodyByType[userType]}
        <a href="${ctaUrl}"
          style="display:block;text-align:center;background:#dc2626;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:24px;">
          ${ctaLabel} →
        </a>
        <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0 0 8px;">
          Questions? Reply to this email or reach us at
          <a href="mailto:hello@garagecherries.com" style="color:#dc2626;">hello@garagecherries.com</a>.
        </p>
        <p style="color:#71717a;font-size:13px;margin:0;">
          Thank you for being part of GarageCherries from day one. 🍒
        </p>
        <hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;" />
        <p style="color:#a1a1aa;font-size:11px;margin:0;">
          GarageCherries · 250th Birthday Promo Expiry Notice ·
          <a href="https://www.garagecherries.com" style="color:#a1a1aa;">garagecherries.com</a>
        </p>
      </div>
    </div>
  `;
}
