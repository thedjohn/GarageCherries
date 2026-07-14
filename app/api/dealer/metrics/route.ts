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

  // Dealer's own listing ids — conversations has no dealer_id column, only
  // listing_id, so buyer-contact activity is scoped the same way GET
  // /api/conversations already scopes seller conversations.
  const { data: dealerListings } = await admin
    .from('listings')
    .select('id, title')
    .eq('seller_id', dealerId);
  const dealerListingIds = (dealerListings ?? []).map(l => l.id);
  const listingTitles: Record<string, string> = Object.fromEntries((dealerListings ?? []).map(l => [l.id, l.title]));

  // Inquiries last 30d — sourced from conversations (the live Message Seller
  // system). The old `inquiries` table has had no live writer since that
  // button switched to conversations/messages, so it always reported 0.
  let inquiries30d = 0;
  let inquiriesPrev30d = 0;
  let recentInquiries: { id: string; listing_id: string; buyer_name: string; buyer_email: string; message: string; created_at: string; carTitle: string }[] = [];

  if (dealerListingIds.length > 0) {
    const { count: c30 } = await admin
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .in('listing_id', dealerListingIds)
      .gte('created_at', thirtyDaysAgo);
    inquiries30d = c30 ?? 0;

    const { count: cPrev30 } = await admin
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .in('listing_id', dealerListingIds)
      .gte('created_at', sixtyDaysAgo)
      .lt('created_at', thirtyDaysAgo);
    inquiriesPrev30d = cPrev30 ?? 0;

    // Recent conversations for the tab, enriched with each thread's first
    // message (conversations don't store body text — messages does)
    const { data: recentConvs } = await admin
      .from('conversations')
      .select('id, listing_id, buyer_name, buyer_email, created_at')
      .in('listing_id', dealerListingIds)
      .order('created_at', { ascending: false })
      .limit(20);

    const convIds = (recentConvs ?? []).map(c => c.id);
    const firstMessageByConv: Record<string, string> = {};
    if (convIds.length > 0) {
      const { data: msgs } = await admin
        .from('messages')
        .select('conversation_id, body, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true });
      (msgs ?? []).forEach(m => {
        if (!firstMessageByConv[m.conversation_id]) firstMessageByConv[m.conversation_id] = m.body;
      });
    }

    recentInquiries = (recentConvs ?? []).map(c => ({
      id: c.id,
      listing_id: c.listing_id,
      buyer_name: c.buyer_name,
      buyer_email: c.buyer_email,
      message: firstMessageByConv[c.id] ?? '',
      created_at: c.created_at,
      carTitle: listingTitles[c.listing_id] ?? 'Unknown listing',
    }));
  }

  // Active approved unsold listings + avg days on market
  const { data: cars } = await admin
    .from('listings')
    .select('listed_at')
    .eq('seller_id', dealerId)
    .eq('status', 'approved')
    .eq('is_sold', false);

  const avgDaysOnMarket = cars && cars.length > 0
    ? Math.round(
        cars.reduce((sum, c) => {
          const ms = Date.now() - new Date(c.listed_at).getTime();
          const days = isNaN(ms) ? 0 : ms / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / cars.length
      )
    : 0;

  const viewsDelta = viewsPrev30d ? Math.round(((views30d ?? 0) - viewsPrev30d) / viewsPrev30d * 100) : null;
  const inquiriesDelta = inquiriesPrev30d ? Math.round((inquiries30d - inquiriesPrev30d) / inquiriesPrev30d * 100) : null;

  return NextResponse.json({
    views30d: views30d ?? 0,
    viewsDelta,
    inquiries30d,
    inquiriesDelta,
    avgDaysOnMarket,
    recentInquiries,
  });
}
