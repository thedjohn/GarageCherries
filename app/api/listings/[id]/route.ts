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

  // Block dealers with expired beta
  const betaMode = process.env.BETA_MODE === 'true';
  if (!betaMode) {
    const { data: dealer } = await admin
      .from('dealers')
      .select('beta_expires_at')
      .eq('id', user.id)
      .maybeSingle();
    if (dealer?.beta_expires_at && new Date(dealer.beta_expires_at) < new Date()) {
      return NextResponse.json({ error: 'BETA_EXPIRED', message: 'Your beta period has ended. Please contact us to upgrade your dealer account.' }, { status: 403 });
    }
  }

  // Verify ownership
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, status, resubmission_count, price, year, make, model')
    .eq('id', id)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const {
    price, mileage, description, images, resubmission_note,
    year, make, model, body_style, condition, fuel_type, engine, transmission, color, interior_color, seat_material, city, state,
  } = body;

  // Build update — only allowed fields
  const update: Record<string, unknown> = {};
  if (price !== undefined) update.price = Number(price) || 0;
  if (mileage !== undefined) update.mileage = mileage !== '' && mileage != null ? Number(mileage) : null;
  if (description !== undefined) update.description = description;
  if (images !== undefined) update.images = images;
  if (year !== undefined) update.year = Number(year);
  if (make !== undefined) update.make = make;
  if (model !== undefined) update.model = model;
  if (body_style !== undefined) update.body_style = body_style;
  if (condition !== undefined) update.condition = condition;
  if (fuel_type !== undefined) update.fuel_type = fuel_type;
  if (engine !== undefined) update.engine = engine || null;
  if (transmission !== undefined) update.transmission = transmission;
  if (color !== undefined) update.color = color || null;
  if (interior_color !== undefined) update.interior_color = interior_color || null;
  if (seat_material !== undefined) update.seat_material = seat_material || null;
  if (city !== undefined) update.location = city;
  if (state !== undefined) update.state = state;
  if (make !== undefined || model !== undefined || year !== undefined) {
    const y = year ?? listing.year ?? '';
    const mk = make ?? listing.make ?? '';
    const mo = model ?? listing.model ?? '';
    if (y && mk && mo) update.title = `${y} ${mk} ${mo}`;
  }

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
