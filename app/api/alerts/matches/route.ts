import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/alerts/matches?alertId=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alertId = req.nextUrl.searchParams.get('alertId');
  if (!alertId) return NextResponse.json({ error: 'alertId required' }, { status: 400 });

  // Verify the alert belongs to this user
  const { data: alert } = await supabase
    .from('saved_searches').select('id').eq('id', alertId).eq('user_id', user.id).single();
  if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = createAdminClient();
  const { data: matches } = await admin
    .from('alert_matches')
    .select('car_id, match_score, emailed_at, created_at')
    .eq('saved_search_id', alertId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!matches?.length) return NextResponse.json({ listings: [] });

  const carIds = matches.map(m => m.car_id);
  const { data: listings } = await admin
    .from('listings')
    .select('id, slug, title, year, make, model, price, mileage, location, state, images, status')
    .in('id', carIds);

  const byId = Object.fromEntries((listings ?? []).map(l => [l.id, l]));
  const result = matches
    .map(m => ({ ...byId[m.car_id], matched_at: m.created_at, match_score: m.match_score }))
    .filter(m => m.id);

  return NextResponse.json({ listings: result });
}
