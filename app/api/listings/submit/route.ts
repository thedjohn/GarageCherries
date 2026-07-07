import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/verifyTurnstile';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { US_STATES } from '@/lib/constants';
import { CONDITIONS } from '@/lib/types';
import { createLogger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const log = createLogger('listings/submit');
  const ip = getClientIP(req);
  const { allowed, firstBlock } = rateLimit(`submit:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    if (firstBlock) notifyAdmin('Rate limit hit: listing submit', `IP <strong>${ip}</strong> exceeded the listing submission limit (5/hour).<br/>Consider increasing the limit if this is a legitimate user.`);
    log.warn('Rate limit exceeded', { ip });
    await log.flush();
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  const formData = await req.formData();

  const captchaToken = formData.get('cf-turnstile-response') as string | null;
  if (!await verifyTurnstile(captchaToken)) {
    return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
  }
  const admin = createAdminClient();

  // Capture the logged-in user's ID and profile as seller identity
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sellerId = user?.id ?? null;

  // Pull name/phone from profile; fall back to email for name if profile not set
  let sellerName = user?.email ?? '';
  let sellerPhone = '';
  if (sellerId) {
    const { data: profile } = await admin.from('profiles').select('full_name, phone').eq('id', sellerId).maybeSingle();
    if (profile?.full_name) sellerName = profile.full_name;
    if (profile?.phone) sellerPhone = profile.phone;
  }
  const sellerEmail = user?.email ?? '';

  // Block suspended users
  if (sellerId) {
    const { data: suspension } = await admin
      .from('suspended_users')
      .select('user_id')
      .eq('user_id', sellerId)
      .maybeSingle();
    if (suspension) return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });
  }

  // Dealers are exempt from the listing cap; BETA_MODE bypasses it entirely.
  // The cap itself is enforced atomically in insert_listing_with_limit() below
  // (see supabase/migrations/20260702_race_condition_fixes.sql) to close a
  // check-then-insert race — this block only resolves whether it applies.
  const betaMode = process.env.BETA_MODE === 'true';
  let enforceListingLimit = false;
  if (sellerId && !betaMode) {
    const { data: dealer } = await admin
      .from('dealers')
      .select('id, beta_expires_at')
      .eq('id', sellerId)
      .single();
    if (dealer?.beta_expires_at && new Date(dealer.beta_expires_at) < new Date()) {
      return NextResponse.json({
        error: 'BETA_EXPIRED',
        message: 'Your beta period has ended. Please contact us to upgrade your dealer account.',
      }, { status: 403 });
    }
    enforceListingLimit = !dealer;
  }

  // Images are now uploaded client-side; we receive their public URLs
  const imageUrls: string[] = JSON.parse((formData.get('imageUrls') as string) ?? '[]');

  // Validate all image URLs come from our own storage bucket
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const validImageUrls = imageUrls.filter((url: string) => {
    if (typeof url !== 'string') return false;
    if (!url.startsWith('https://')) return false;
    if (!url.includes(supabaseUrl.replace('https://', ''))) return false;
    if (!url.includes('/listing-images/')) return false;
    return true;
  }).slice(0, 20); // cap at 20 images

  const stateVal = String(formData.get('state') ?? '').toUpperCase().trim();
  if (!US_STATES.has(stateVal)) {
    return NextResponse.json({ error: 'Invalid state code.' }, { status: 400 });
  }

  const conditionVal = String(formData.get('condition') ?? '').trim();
  const validConditions = CONDITIONS.filter(c => c !== 'All');
  if (!validConditions.includes(conditionVal)) {
    return NextResponse.json({ error: 'Invalid condition value.' }, { status: 400 });
  }

  const year = Number(formData.get('year'));
  const make = String(formData.get('make'));
  const model = String(formData.get('model'));
  const slug = `${year}-${make.toLowerCase().replace(/\s+/g, '-')}-${model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  const { error } = await admin.rpc('insert_listing_with_limit', {
    p_id: crypto.randomUUID(),
    p_slug: slug,
    p_title: `${year} ${make} ${model}`,
    p_year: year,
    p_make: make,
    p_model: model,
    p_price: Number(formData.get('price')) || 0,
    p_mileage: formData.get('mileage') ? Number(formData.get('mileage')) : null,
    p_location: formData.get('city'),
    p_state: stateVal,
    p_condition: formData.get('condition'),
    p_body_style: formData.get('bodyStyle'),
    p_transmission: formData.get('transmission'),
    p_engine: formData.get('engine') || null,
    p_color: formData.get('color') || null,
    p_images: validImageUrls,
    p_description: formData.get('description'),
    p_seller_name: sellerName,
    p_seller_phone: sellerPhone,
    p_seller_email: sellerEmail,
    p_vin: formData.get('vin') || null,
    p_vin_verified: formData.get('vinVerified') === 'true',
    p_featured: false,
    p_status: 'pending',
    p_seller_id: sellerId,
    p_enforce_limit: enforceListingLimit,
  });

  if (error) {
    if (error.code === 'P0001') {
      log.warn('Listing limit reached', { sellerId: sellerId ?? undefined, ip });
      await log.flush();
      return NextResponse.json({
        error: 'LISTING_LIMIT',
        message: 'You have reached the 10 active listing limit for private sellers. Please contact us to upgrade to a Dealer account.',
      }, { status: 403 });
    }
    log.error('Listing insert failed', new Error(error.message), { sellerId: sellerId ?? undefined, make, model, year, ip });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log.info('Listing submitted', { sellerId: sellerId ?? undefined, sellerEmail, make, model, year, imageCount: validImageUrls.length, ip });
  await log.flush();
  return NextResponse.json({ success: true });
}
