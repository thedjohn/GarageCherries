import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const carIds = new URL(request.url).searchParams.get('carIds')?.split(',').filter(Boolean) ?? [];
  if (!carIds.length) return NextResponse.json({ counts: {}, messaged: {}, views: {}, totalWatchers: {} });

  const admin = createAdminClient();

  // Verify all requested carIds belong to this user (ownership check) — works for
  // both dealers and private sellers, since listings.seller_id is set to the
  // authenticated user's id either way.
  const { data: ownedListings } = await admin
    .from('listings')
    .select('id')
    .eq('seller_id', user.id)
    .in('id', carIds);
  const ownedIds = new Set((ownedListings ?? []).map((r: { id: string }) => r.id));
  const safeCarIds = carIds.filter(id => ownedIds.has(id));
  if (!safeCarIds.length) return NextResponse.json({ counts: {}, messaged: {}, views: {}, totalWatchers: {} });

  const { data: rows } = await admin
    .from('watchlists')
    .select('car_id, dealer_messaged_at, allow_dealer_contact, dealer_contact_blocked')
    .in('car_id', safeCarIds);

  // Counted via a GROUP BY RPC, not a raw select+forEach — Supabase caps any
  // unbounded .select() at 1000 rows, which was silently undercounting views
  // once a batch of listings' combined view rows crossed that threshold.
  const { data: viewCounts } = await admin.rpc('count_listing_views', { p_listing_ids: safeCarIds });

  const counts: Record<string, number>  = {};
  const messaged: Record<string, boolean> = {};
  const totalWatchers: Record<string, number> = {};
  const views: Record<string, number> = {};

  safeCarIds.forEach(id => { counts[id] = 0; messaged[id] = false; totalWatchers[id] = 0; views[id] = 0; });

  (rows ?? []).forEach((r: any) => {
    if (r.allow_dealer_contact && !r.dealer_contact_blocked && !r.dealer_messaged_at) {
      counts[r.car_id] = (counts[r.car_id] ?? 0) + 1;
    }
    if (r.dealer_messaged_at) messaged[r.car_id] = true;
    totalWatchers[r.car_id] = (totalWatchers[r.car_id] ?? 0) + 1;
  });

  (viewCounts ?? []).forEach((r: any) => {
    views[r.listing_id] = Number(r.view_count);
  });

  return NextResponse.json({ counts, messaged, views, totalWatchers });
}
