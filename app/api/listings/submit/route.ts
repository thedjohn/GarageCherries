import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/verifyTurnstile';
import { notifyAdmin } from '@/lib/notifyAdmin';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed, firstBlock } = rateLimit(`submit:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    if (firstBlock) notifyAdmin('Rate limit hit: listing submit', `IP <strong>${ip}</strong> exceeded the listing submission limit (5/hour).<br/>Consider increasing the limit if this is a legitimate user.`);
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  const formData = await req.formData();

  const captchaToken = formData.get('cf-turnstile-response') as string | null;
  if (!await verifyTurnstile(captchaToken)) {
    return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
  }
  const admin = createAdminClient();

  // Capture the logged-in user's ID as seller_id
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sellerId = user?.id ?? null;

  // Enforce listing limits for private sellers (dealers are exempt)
  const betaMode = process.env.BETA_MODE === 'true';
  if (sellerId && !betaMode) {
    const [{ data: dealer }, { count: activeCount }] = await Promise.all([
      admin.from('dealers').select('id, beta_expires_at').eq('id', sellerId).single(),
      admin.from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .in('status', ['pending', 'approved']),
    ]);
    if (dealer?.beta_expires_at && new Date(dealer.beta_expires_at) < new Date()) {
      return NextResponse.json({
        error: 'BETA_EXPIRED',
        message: 'Your beta period has ended. Please contact us to upgrade your dealer account.',
      }, { status: 403 });
    }
    if (!dealer && (activeCount ?? 0) >= 10) {
      return NextResponse.json({
        error: 'LISTING_LIMIT',
        message: 'You have reached the 10 active listing limit for private sellers. Please contact us to upgrade to a Dealer account.',
      }, { status: 403 });
    }
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

  const year = Number(formData.get('year'));
  const make = String(formData.get('make'));
  const model = String(formData.get('model'));
  const slug = `${year}-${make.toLowerCase().replace(/\s+/g, '-')}-${model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  const { error } = await admin.from('listings').insert({
    id: crypto.randomUUID(),
    slug,
    title: `${year} ${make} ${model}`,
    year,
    make,
    model,
    price: Number(formData.get('price')) || 0,
    mileage: formData.get('mileage') ? Number(formData.get('mileage')) : null,
    location: formData.get('city'),
    state: formData.get('state'),
    condition: formData.get('condition'),
    body_style: formData.get('bodyStyle'),
    transmission: formData.get('transmission'),
    engine: formData.get('engine') || null,
    color: formData.get('color') || null,
    images: validImageUrls,
    description: formData.get('description'),
    seller_name: formData.get('sellerName'),
    seller_phone: formData.get('sellerPhone'),
    seller_email: formData.get('sellerEmail'),
    featured: false,
    status: 'pending',
    seller_id: sellerId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
