import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`watchlist:${ip}`, 60, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { carId, currentPrice, allowDealerContact } = await request.json();
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('watchlists').select('id').eq('user_id', user.id).eq('car_id', carId).single();

  if (existing) {
    await supabase.from('watchlists').delete().eq('id', existing.id);
    return NextResponse.json({ watching: false });
  }

  await supabase.from('watchlists').insert({
    user_id:               user.id,
    car_id:                carId,
    price_at_add:          currentPrice ?? 0,
    allow_dealer_contact:  allowDealerContact !== false,
  });
  return NextResponse.json({ watching: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const carId = new URL(request.url).searchParams.get('carId');
  if (!carId) return NextResponse.json({ error: 'carId required' }, { status: 400 });

  await supabase.from('watchlists').delete().eq('user_id', user.id).eq('car_id', carId);
  return NextResponse.json({ watching: false });
}
