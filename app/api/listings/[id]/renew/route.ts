import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

// POST /api/listings/[id]/renew — seller extends their listing 30 more days
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('listings')
    .select('id, seller_id, status, is_feed_managed')
    .eq('id', id)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to update this listing' }, { status: 403 });
  }
  if (listing.status !== 'approved') {
    return NextResponse.json({ error: 'Only active listings can be renewed' }, { status: 400 });
  }
  if (listing.is_feed_managed) {
    return NextResponse.json({ error: 'Feed-managed listings renew automatically and cannot be renewed manually' }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from('listings').update({ expires_at: expiresAt }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expiresAt });
}
