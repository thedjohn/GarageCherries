import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import sharp from 'sharp';

async function watermark(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const image = sharp(buffer);
  const { width = 800, height = 600 } = await image.metadata();

  const fontSize = Math.max(16, Math.round(width * 0.032));
  const padX = Math.round(width * 0.02);
  const padY = Math.round(height * 0.02);
  const pillH = fontSize + 14;
  const text = 'GarageCherries.com';
  const approxTextW = text.length * fontSize * 0.58;
  const pillW = Math.round(approxTextW + 24);

  const svg = `
    <svg width="${pillW}" height="${pillH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${pillW}" height="${pillH}" rx="5" fill="black" fill-opacity="0.52"/>
      <text
        x="${pillW / 2}" y="${pillH / 2 + fontSize * 0.36}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        fill-opacity="0.92"
        text-anchor="middle"
      >${text}</text>
    </svg>`;

  return image
    .composite([{
      input: Buffer.from(svg),
      gravity: 'southeast',
      top: height - pillH - padY,
      left: width - pillW - padX,
    }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const admin = createAdminClient();

  const imageFiles = formData.getAll('images') as File[];
  const imageUrls: string[] = [];

  for (const file of imageFiles) {
    if (!file.size) continue;
    const original = Buffer.from(await file.arrayBuffer());
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from('listing-images')
      .upload(path, original, { contentType: file.type });
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
