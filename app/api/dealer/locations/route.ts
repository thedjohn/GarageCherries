import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function requireOwnDealer(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: dealer } = await admin.from('dealers').select('id').eq('id', user.id).single();
  if (!dealer) return { error: NextResponse.json({ error: 'Dealer not found' }, { status: 403 }) };

  return { admin, dealerId: dealer.id as string };
}

// Mirrors a dealer's primary location onto the dealers table's own phone/address/etc,
// so every existing feature reading those fields keeps working unchanged.
async function mirrorPrimaryToDealer(admin: ReturnType<typeof createAdminClient>, dealerId: string) {
  const { data: primary } = await admin
    .from('dealer_locations')
    .select('address, city, state, zip, phone, email')
    .eq('dealer_id', dealerId)
    .eq('is_primary', true)
    .maybeSingle();

  if (!primary) return;

  await admin.from('dealers').update({
    address: primary.address,
    location: primary.city,
    state: primary.state,
    zip: primary.zip,
    phone: primary.phone,
    email: primary.email,
  }).eq('id', dealerId);
}

// GET /api/dealer/locations -- list the authenticated dealer's own locations
export async function GET(request: NextRequest) {
  const auth = await requireOwnDealer(request);
  if ('error' in auth) return auth.error;

  const { data, error } = await auth.admin
    .from('dealer_locations')
    .select('*')
    .eq('dealer_id', auth.dealerId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ locations: data ?? [] });
}

// POST /api/dealer/locations -- add a new location
export async function POST(request: NextRequest) {
  const auth = await requireOwnDealer(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { city, state, address, zip, phone, email, isPrimary } = body;
  if (!city?.trim() || !state?.trim()) {
    return NextResponse.json({ error: 'City and state are required.' }, { status: 400 });
  }

  if (isPrimary) {
    await auth.admin.from('dealer_locations').update({ is_primary: false }).eq('dealer_id', auth.dealerId);
  }

  const { data, error } = await auth.admin.from('dealer_locations').insert({
    dealer_id: auth.dealerId,
    city: city.trim(),
    state: state.trim().toUpperCase().slice(0, 2),
    address: address?.trim() || null,
    zip: zip?.trim() || null,
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    is_primary: !!isPrimary,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (isPrimary) await mirrorPrimaryToDealer(auth.admin, auth.dealerId);

  return NextResponse.json({ location: data });
}

// PATCH /api/dealer/locations -- edit a location, or change which one is primary
export async function PATCH(request: NextRequest) {
  const auth = await requireOwnDealer(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { id, city, state, address, zip, phone, email, isPrimary } = body;
  if (!id) return NextResponse.json({ error: 'Location id is required.' }, { status: 400 });

  const { data: existing } = await auth.admin
    .from('dealer_locations').select('id').eq('id', id).eq('dealer_id', auth.dealerId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Location not found.' }, { status: 404 });

  if (isPrimary) {
    await auth.admin.from('dealer_locations').update({ is_primary: false }).eq('dealer_id', auth.dealerId);
  }

  const fields: Record<string, unknown> = {};
  if (city !== undefined) fields.city = city.trim();
  if (state !== undefined) fields.state = state.trim().toUpperCase().slice(0, 2);
  if (address !== undefined) fields.address = address?.trim() || null;
  if (zip !== undefined) fields.zip = zip?.trim() || null;
  if (phone !== undefined) fields.phone = phone?.trim() || null;
  if (email !== undefined) fields.email = email?.trim() || null;
  if (isPrimary !== undefined) fields.is_primary = !!isPrimary;

  const { error } = await auth.admin.from('dealer_locations').update(fields).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await mirrorPrimaryToDealer(auth.admin, auth.dealerId);
  return NextResponse.json({ ok: true });
}

// DELETE /api/dealer/locations?id=... -- remove a location
export async function DELETE(request: NextRequest) {
  const auth = await requireOwnDealer(request);
  if ('error' in auth) return auth.error;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Location id is required.' }, { status: 400 });

  const { data: existing } = await auth.admin
    .from('dealer_locations').select('id, is_primary').eq('id', id).eq('dealer_id', auth.dealerId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Location not found.' }, { status: 404 });

  const { error } = await auth.admin.from('dealer_locations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
