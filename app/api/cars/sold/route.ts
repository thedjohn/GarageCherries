import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/cars/sold — dealer marks a listing as sold
export async function POST(request: NextRequest) {
  const { carId, soldPrice } = await request.json();
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const admin = createAdminClient();
  const { data: car } = await admin.from('cars').select('id, seller_id, title').eq('id', carId).single();
  if (!car || car.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to update this listing' }, { status: 403 });
  }

  const { error } = await admin.from('cars').update({
    is_sold: true,
    sold_at: new Date().toISOString(),
    sold_price: soldPrice ?? null,
  }).eq('id', carId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
