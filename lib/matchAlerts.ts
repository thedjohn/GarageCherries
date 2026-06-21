import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import type { Car } from '@/lib/types';
import { formatPrice, toSegment } from '@/lib/data';

const BASE_URL = 'https://www.garagecherries.com';

function scoreMatch(car: Car, s: any): number {
  // Hard criteria — if set, must match exactly
  if (s.make && s.make !== 'All Makes' && car.make.toLowerCase() !== s.make.toLowerCase()) return 0;
  if (s.model && car.model.toLowerCase() !== s.model.toLowerCase()) return 0;

  let possible = 0;
  let matched = 0;

  if (s.year_min || s.year_max) {
    possible += 2;
    if ((!s.year_min || car.year >= s.year_min) && (!s.year_max || car.year <= s.year_max)) matched += 2;
  }
  if (s.price_max) {
    possible += 2;
    if (car.price <= s.price_max) matched += 2;
  }
  if (s.mileage_max) {
    possible += 1;
    if (car.mileage <= s.mileage_max) matched += 1;
  }
  if (s.condition?.length) {
    possible += 1;
    if (s.condition.includes(car.condition)) matched += 1;
  }
  if (s.body_style) {
    possible += 1;
    if (car.bodyStyle === s.body_style) matched += 1;
  }
  if (s.transmission) {
    possible += 1;
    if (car.transmission === s.transmission) matched += 1;
  }
  if (s.state) {
    possible += 1;
    if (car.state === s.state) matched += 1;
  }

  if (possible === 0) return 1; // only hard criteria set, both matched
  return matched / possible;
}

function alertName(s: any): string {
  if (s.name) return s.name;
  const parts = [s.make, s.model].filter(Boolean);
  return parts.length ? parts.join(' ') + ' Alert' : 'Car Alert';
}

function matchBadges(car: Car, s: any): string {
  const checks: string[] = [];
  if (s.make) checks.push(`✓ Make: ${car.make}`);
  if (s.model) checks.push(`✓ Model: ${car.model}`);
  if (s.year_min || s.year_max) checks.push(`✓ Year: ${car.year}`);
  if (s.price_max && car.price <= s.price_max) checks.push(`✓ Price: ${formatPrice(car.price)}`);
  if (s.mileage_max && car.mileage <= s.mileage_max) checks.push(`✓ Mileage: ${car.mileage.toLocaleString()} mi`);
  if (s.condition?.includes(car.condition)) checks.push(`✓ Condition: ${car.condition}`);
  if (s.transmission && car.transmission === s.transmission) checks.push(`✓ Transmission: ${car.transmission}`);
  return checks.join(' &nbsp;&nbsp; ');
}

function buildEmail(car: Car, s: any, listingUrl: string, alertId: string): string {
  const image = car.images?.[0] ?? '';
  const pauseUrl = `${BASE_URL}/account/alerts?pause=${alertId}`;
  const name = alertName(s);
  const badges = matchBadges(car, s);

  return `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
  <div style="background:#18181b;padding:20px 24px;border-radius:12px 12px 0 0">
    <span style="font-size:20px;font-weight:800;color:#fff">Garage<span style="color:#ef4444">Cherries</span></span>
  </div>
  <div style="background:#fff;border:1px solid #e4e4e7;border-top:none;padding:32px 24px;border-radius:0 0 12px 12px">
    <p style="font-size:13px;color:#71717a;margin:0 0 6px">A car matching your alert just listed</p>
    <h2 style="font-size:22px;font-weight:800;margin:0 0 20px;color:#18181b">${name}</h2>

    ${image ? `<img src="${image}" alt="${car.title}" style="width:100%;border-radius:10px;object-fit:cover;margin-bottom:20px;max-height:260px" />` : ''}

    <h3 style="font-size:18px;font-weight:700;margin:0 0 4px">${car.title}</h3>
    <p style="font-size:15px;color:#ef4444;font-weight:700;margin:0 0 8px">${formatPrice(car.price)}</p>
    <p style="font-size:13px;color:#71717a;margin:0 0 16px">${car.mileage.toLocaleString()} miles &nbsp;·&nbsp; ${car.condition} &nbsp;·&nbsp; ${car.location}, ${car.state}</p>

    <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;font-size:12px;color:#52525b;margin-bottom:24px">${badges}</div>

    <a href="${listingUrl}" style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none">View This Listing →</a>

    <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0 16px">
    <p style="font-size:12px;color:#a1a1aa;margin:0">
      You set up a car alert for "${name}".<br>
      <a href="${pauseUrl}" style="color:#71717a">Pause this alert</a> &nbsp;·&nbsp;
      <a href="${BASE_URL}/account/alerts" style="color:#71717a">Manage all alerts</a>
    </p>
  </div>
</div>`;
}

export async function matchAndNotifyAlerts(car: Car) {
  const admin = createAdminClient();

  const { data: searches } = await admin
    .from('saved_searches')
    .select('*')
    .eq('active', true)
    .eq('paused', false);

  if (!searches?.length) return;

  const now = new Date();

  for (const s of searches) {
    const score = scoreMatch(car, s);
    if (score < 0.7) continue;

    // Cooldown: 24h per alert
    if (s.last_emailed_at) {
      const hrs = (now.getTime() - new Date(s.last_emailed_at).getTime()) / 3_600_000;
      if (hrs < 24) continue;
    }

    // Avoid duplicate match for same car
    const { data: existing } = await admin
      .from('alert_matches')
      .select('id')
      .eq('saved_search_id', s.id)
      .eq('car_id', car.id)
      .single();
    if (existing) continue;

    try {
      const { data: userData } = await admin.auth.admin.getUserById(s.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const listingUrl = `${BASE_URL}/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`;

      await admin.from('alert_matches').insert({
        saved_search_id: s.id,
        car_id: car.id,
        match_score: score,
        emailed_at: now.toISOString(),
      });

      await admin.from('saved_searches').update({
        last_emailed_at: now.toISOString(),
        last_matched_at: now.toISOString(),
      }).eq('id', s.id);

      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'GarageCherries <notifications@garagecherries.com>',
        to: email,
        subject: `New match for your "${alertName(s)}" — ${formatPrice(car.price)}`,
        html: buildEmail(car, s, listingUrl, s.id),
      });
    } catch {
      // skip and continue
    }
  }
}
