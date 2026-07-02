import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();

  // Block suspended users
  const { data: suspension } = await admin
    .from('suspended_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (suspension) return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });

  // Verify ownership
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, status, resubmission_count, price')
    .eq('id', id)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { price, mileage, description, seller_name, seller_phone, seller_email, images, resubmission_note } = body;

  // Build update — only allowed fields
  const update: Record<string, unknown> = {};
  if (price !== undefined) update.price = Number(price) || 0;
  if (mileage !== undefined) update.mileage = mileage !== '' && mileage != null ? Number(mileage) : null;
  if (description !== undefined) update.description = description;
  if (seller_name !== undefined) update.seller_name = seller_name;
  if (seller_phone !== undefined) update.seller_phone = seller_phone;
  if (seller_email !== undefined) update.seller_email = seller_email;
  if (images !== undefined) update.images = images;

  // If resubmitting a rejected listing, require a fix note and send back to pending
  if (listing.status === 'rejected') {
    if (!resubmission_note?.trim()) {
      return NextResponse.json({ error: 'Please describe what you fixed before resubmitting.' }, { status: 400 });
    }
    update.status = 'pending';
    update.resubmission_note = resubmission_note.trim();
    update.resubmission_count = (listing.resubmission_count ?? 0) + 1;
    update.rejection_reason = null; // clear old reason
  } else if (listing.status === 'approved') {
    // Approved listings go back to pending for re-review
    update.status = 'pending';
    update.resubmission_count = (listing.resubmission_count ?? 0) + 1;
  }

  const { error } = await admin.from('listings').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If price dropped, record it and notify watchers
  const newPrice = price !== undefined ? Number(price) : null;
  const oldPrice = listing.price ?? 0;
  if (newPrice !== null && newPrice > 0 && newPrice < oldPrice) {
    void admin.from('price_history').insert({
      car_id: id,
      old_price: oldPrice,
      price: newPrice,
      changed_at: new Date().toISOString(),
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com';
    fetch(`${base}/api/notify-watchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId: id, oldPrice, newPrice }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();

  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, images')
    .eq('id', id)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Clean up storage images
  if (listing.images?.length) {
    const paths = (listing.images as string[])
      .map(url => url.split('/listing-images/')[1])
      .filter(Boolean);
    if (paths.length) await admin.storage.from('listing-images').remove(paths);
  }

  // Clean up conversations
  await admin.from('conversations').delete().eq('listing_id', id);

  const { error } = await admin.from('listings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
