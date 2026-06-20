import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const carIds = new URL(request.url).searchParams.get('carIds')?.split(',').filter(Boolean) ?? [];
  if (!carIds.length) return NextResponse.json({ counts: {}, messaged: {} });

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from('watchlists')
    .select('car_id, dealer_messaged_at, allow_dealer_contact, dealer_contact_blocked')
    .in('car_id', carIds);

  const counts: Record<string, number>  = {};
  const messaged: Record<string, boolean> = {};

  carIds.forEach(id => { counts[id] = 0; messaged[id] = false; });

  (rows ?? []).forEach((r: any) => {
    if (r.allow_dealer_contact && !r.dealer_contact_blocked && !r.dealer_messaged_at) {
      counts[r.car_id] = (counts[r.car_id] ?? 0) + 1;
    }
    if (r.dealer_messaged_at) messaged[r.car_id] = true;
  });

  return NextResponse.json({ counts, messaged });
}
