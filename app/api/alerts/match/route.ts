import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { matchAndNotifyAlerts } from '@/lib/matchAlerts';

// POST /api/alerts/match — internal only, called after a listing is approved
// Requires Bearer INTERNAL_API_SECRET header
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!process.env.INTERNAL_API_SECRET || auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { carId } = await request.json();
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: car } = await admin.from('listings').select('*').eq('id', carId).single();
  if (!car) return NextResponse.json({ error: 'Car not found' }, { status: 404 });

  // Adapt raw DB row to Car shape
  const adapted = {
    id: car.id, slug: car.slug, title: car.title, year: car.year,
    make: car.make, model: car.model, price: car.price ?? 0,
    mileage: car.mileage ?? 0, location: car.location ?? '',
    state: car.state ?? '', condition: car.condition,
    bodyStyle: car.body_style ?? '', transmission: car.transmission ?? 'Automatic',
    engine: car.engine ?? '', color: car.color ?? '',
    images: car.images ?? [], description: car.description ?? '',
    sellerId: car.seller_id ?? '', sellerName: car.seller_name ?? '',
    sellerPhone: car.seller_phone ?? '', featured: car.featured ?? false,
    listedAt: car.listed_at ?? '',
  };

  // Fire-and-forget — don't block the response
  matchAndNotifyAlerts(adapted as any).catch(() => {});

  return NextResponse.json({ ok: true });
}
