import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const admin = createAdminClient();

  // Capture the logged-in user's ID as seller_id
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sellerId = user?.id ?? null;

  // Enforce listing limits for private sellers (dealers are exempt)
  const betaMode = process.env.BETA_MODE === 'true';
  if (sellerId && !betaMode) {
    const [{ data: dealer }, { count: activeCount }] = await Promise.all([
      admin.from('dealers').select('id').eq('id', sellerId).single(),
      admin.from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .in('status', ['pending', 'approved']),
    ]);
    if (!dealer && (activeCount ?? 0) >= 10) {
      return NextResponse.json({
        error: 'LISTING_LIMIT',
        message: 'You have reached the 10 active listing limit for private sellers. Please contact us to upgrade to a Dealer account.',
      }, { status: 403 });
    }
  }

  // Images are now uploaded client-side; we receive their public URLs
  const imageUrls: string[] = JSON.parse((formData.get('imageUrls') as string) ?? '[]');

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
    images: imageUrls,
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
