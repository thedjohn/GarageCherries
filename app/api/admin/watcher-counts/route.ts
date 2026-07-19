import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';

// Admin-scoped counterpart to /api/dealer/watcher-counts — same view/watcher
// aggregation, but for any listing (gated by admin role instead of ownership).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const carIds = new URL(request.url).searchParams.get('carIds')?.split(',').filter(Boolean) ?? [];
  if (!carIds.length) return NextResponse.json({ views: {}, totalWatchers: {} });

  const admin = createAdminClient();

  const { data: watchRows } = await admin
    .from('watchlists')
    .select('car_id')
    .in('car_id', carIds);

  // Counted via a GROUP BY RPC, not a raw select+forEach — Supabase caps any
  // unbounded .select() at 1000 rows, which was silently undercounting views
  // once a batch of listings' combined view rows crossed that threshold.
  const { data: viewCounts } = await admin.rpc('count_listing_views', { p_listing_ids: carIds });

  const totalWatchers: Record<string, number> = {};
  const views: Record<string, number> = {};
  carIds.forEach(id => { totalWatchers[id] = 0; views[id] = 0; });

  (watchRows ?? []).forEach((r: { car_id: string }) => {
    totalWatchers[r.car_id] = (totalWatchers[r.car_id] ?? 0) + 1;
  });
  (viewCounts ?? []).forEach((r: { listing_id: string; view_count: number }) => {
    views[r.listing_id] = Number(r.view_count);
  });

  return NextResponse.json({ views, totalWatchers });
}
