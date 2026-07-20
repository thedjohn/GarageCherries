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

  // Counted via GROUP BY RPCs, not raw select+forEach — Supabase caps any
  // unbounded .select() at 1000 rows. The old raw select here fed counts/
  // messaged/totalWatchers all from the same row set, so hitting the cap
  // would've silently corrupted the "Message watchers" eligibility list and
  // messaged flags too, not just the displayed total — aggregating all three
  // server-side fixes them all at once regardless of row volume.
  const { data: watcherCounts } = await admin.rpc('count_dealer_watchers', { p_listing_ids: safeCarIds });
  const { data: viewCounts } = await admin.rpc('count_listing_views', { p_listing_ids: safeCarIds });

  const counts: Record<string, number>  = {};
  const messaged: Record<string, boolean> = {};
  const totalWatchers: Record<string, number> = {};
  const views: Record<string, number> = {};

  safeCarIds.forEach(id => { counts[id] = 0; messaged[id] = false; totalWatchers[id] = 0; views[id] = 0; });

  (watcherCounts ?? []).forEach((r: any) => {
    counts[r.car_id] = Number(r.eligible_count);
    messaged[r.car_id] = Boolean(r.messaged);
    totalWatchers[r.car_id] = Number(r.total_watchers);
  });

  (viewCounts ?? []).forEach((r: any) => {
    views[r.listing_id] = Number(r.view_count);
  });

  return NextResponse.json({ counts, messaged, views, totalWatchers });
}
