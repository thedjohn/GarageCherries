import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const admin = createAdminClient();

  const imageFiles = formData.getAll('images') as File[];
  const imageUrls: string[] = [];

  for (const file of imageFiles) {
    if (!file.size) continue;
    const bytes = await file.arrayBuffer();
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from('listing-images')
      .upload(path, Buffer.from(bytes), { contentType: file.type });
    if (!uploadError) {
      const { data } = admin.storage.from('listing-images').getPublicUrl(path);
      imageUrls.push(data.publicUrl);
    }
  }

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
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
