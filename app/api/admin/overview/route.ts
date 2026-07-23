import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';

// Buckets raw timestamps into a zero-filled daily series (oldest first) --
// same helper as GET /api/dealer/metrics, duplicated rather than shared
// since these two routes have no other code in common and pulling it into
// a shared lib for one function felt like premature abstraction.
function bucketByDay(timestamps: (string | null)[], days: number): { date: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const ts of timestamps) {
    if (!ts) continue;
    const day = ts.slice(0, 10);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  const series: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    series.push({ date: d, count: counts[d] ?? 0 });
  }
  return series;
}

// GET /api/admin/overview -- marketplace-wide operational health, gated
// admin+ (not exposed to moderator/support, who have their own
// narrower tabs already).
//
// Two panels are real 30-day trends (funnel, dealer signups); the other
// two are current-snapshot counts only, not trends -- listings.status has
// no "left the pending queue at X" timestamp (rejected listings have no
// rejected_at at all), and messages.reported is a bare boolean with no
// flagged/resolved timestamp, so neither queue's history can be
// reconstructed from what's actually tracked today.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: pendingRows },
    { count: reportedCount },
    { count: views30d },
    { count: inquiries30d },
    { count: offers30d },
    { count: sold30d },
    { data: dealerRows },
  ] = await Promise.all([
    admin.from('listings').select('created_at').eq('status', 'pending'),
    admin.from('messages').select('id', { count: 'exact', head: true }).eq('reported', true),
    admin.from('listing_views').select('id', { count: 'exact', head: true }).gte('viewed_at', thirtyDaysAgo),
    admin.from('conversations').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    admin.from('offers').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('is_sold', true).gte('sold_at', thirtyDaysAgo),
    admin.from('dealers').select('created_at').gte('created_at', thirtyDaysAgo),
  ]);

  const pendingCount = pendingRows?.length ?? 0;
  const oldestPendingDays = pendingCount > 0
    ? Math.round(Math.max(...pendingRows!.map(r => (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))))
    : null;

  return NextResponse.json({
    pendingQueue: { count: pendingCount, oldestDays: oldestPendingDays },
    reportedQueue: { count: reportedCount ?? 0 },
    funnel: {
      views30d: views30d ?? 0,
      inquiries30d: inquiries30d ?? 0,
      offers30d: offers30d ?? 0,
      sold30d: sold30d ?? 0,
    },
    dealerSignupsTrend: bucketByDay((dealerRows ?? []).map(r => r.created_at), 30),
  });
}
