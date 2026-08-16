import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Dedicated route so a dealer's Featured toggle goes through a server-side
// ownership + cap check, rather than the raw client-side Supabase write the
// dealer dashboard used before -- that path let a dealer feature every
// listing they own for free, with no limit. No dealer is actually on a paid
// plan yet (everyone is 'beta'), so the cap is derived from the dealer's own
// active listing count, matching the tiers advertised on /pricing (Starter
// <=5 listings -> 0 featured, Pro <=25 -> 3 featured, Unlimited -> 10
// featured) -- replace with real plan-based limits once dealer
// plans/billing exist.
function featuredCapForListingCount(activeListingCount: number): number {
  if (activeListingCount <= 5) return 0;
  if (activeListingCount <= 25) return 3;
  return 10;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { featured } = await req.json();
  if (typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'featured must be a boolean' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, featured')
    .eq('id', id)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (featured && !listing.featured) {
    const { count: activeCount } = await admin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'approved')
      .eq('is_sold', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    const cap = featuredCapForListingCount(activeCount ?? 0);

    const { count: featuredCount } = await admin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('featured', true);

    if ((featuredCount ?? 0) >= cap) {
      return NextResponse.json(
        {
          error: cap === 0
            ? 'Featured listings aren’t available at your current inventory size yet.'
            : `You can feature up to ${cap} listings at a time. Unfeature another listing first.`,
        },
        { status: 403 },
      );
    }
  }

  const { error } = await admin.from('listings').update({ featured }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
