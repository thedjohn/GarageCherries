import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Get dealer id
  const { data: dealer } = await admin
    .from('dealers')
    .select('id')
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .single();

  if (!dealer) return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });

  const dealerId = dealer.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // Views last 30d
  const { count: views30d } = await admin
    .from('listing_views')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .gte('viewed_at', thirtyDaysAgo);

  // Views 30-60d ago (for comparison)
  const { count: viewsPrev30d } = await admin
    .from('listing_views')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .gte('viewed_at', sixtyDaysAgo)
    .lt('viewed_at', thirtyDaysAgo);

  // Inquiries last 30d
  const { count: inquiries30d } = await admin
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .gte('created_at', thirtyDaysAgo);

  // Inquiries 30-60d ago
  const { count: inquiriesPrev30d } = await admin
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .gte('created_at', sixtyDaysAgo)
    .lt('created_at', thirtyDaysAgo);

  // Active listings + avg days on market
  const { data: cars } = await admin
    .from('cars')
    .select('listed_at')
    .eq('seller_id', dealerId);

  const avgDaysOnMarket = cars && cars.length > 0
    ? Math.round(
        cars.reduce((sum, c) => {
          const days = (Date.now() - new Date(c.listed_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / cars.length
      )
    : 0;

  // Recent inquiries for the tab
  const { data: recentInquiries } = await admin
    .from('inquiries')
    .select('id, listing_id, buyer_name, buyer_email, buyer_phone, message, created_at, read')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Enrich inquiries with listing titles
  const listingIds = [...new Set((recentInquiries ?? []).map(i => i.listing_id))];
  let listingTitles: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: titles } = await admin
      .from('cars')
      .select('id, title')
      .in('id', listingIds);
    listingTitles = Object.fromEntries((titles ?? []).map(t => [t.id, t.title]));
  }

  const viewsDelta = viewsPrev30d ? Math.round(((views30d ?? 0) - viewsPrev30d) / viewsPrev30d * 100) : null;
  const inquiriesDelta = inquiriesPrev30d ? Math.round(((inquiries30d ?? 0) - inquiriesPrev30d) / inquiriesPrev30d * 100) : null;

  return NextResponse.json({
    views30d: views30d ?? 0,
    viewsDelta,
    inquiries30d: inquiries30d ?? 0,
    inquiriesDelta,
    avgDaysOnMarket,
    recentInquiries: (recentInquiries ?? []).map(i => ({
      ...i,
      carTitle: listingTitles[i.listing_id] ?? 'Unknown listing',
    })),
  });
}
