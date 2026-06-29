import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  return { user, role };
}

export async function GET() {
  const { role } = await auth();
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const [
    { data: { users: authUsers } },
    { data: dealers },
    { data: advertisers },
    { data: listings },
    { data: suspended },
    { data: watchlists },
    { data: conversations },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('dealers').select('id, name, location, state, since, logo'),
    admin.from('advertisers').select('id, company_name, website').catch(() => ({ data: [] })),
    admin.from('listings').select('seller_id, status'),
    admin.from('suspended_users').select('user_id, reason, suspended_at'),
    admin.from('watchlists').select('user_id'),
    admin.from('conversations').select('buyer_id, listing_id'),
  ]);

  const dealerIds = new Set((dealers ?? []).map((d: any) => d.id));
  const dealerMap = Object.fromEntries((dealers ?? []).map((d: any) => [d.id, d]));
  const advertiserIds = new Set((advertisers ?? []).map((a: any) => a.id));
  const advertiserMap = Object.fromEntries((advertisers ?? []).map((a: any) => [a.id, a]));
  const suspendedMap = Object.fromEntries((suspended ?? []).map(s => [s.user_id, s]));

  // Listing counts per seller
  const listingCounts: Record<string, { approved: number; pending: number; rejected: number }> = {};
  for (const l of listings ?? []) {
    if (!l.seller_id) continue;
    if (!listingCounts[l.seller_id]) listingCounts[l.seller_id] = { approved: 0, pending: 0, rejected: 0 };
    if (l.status === 'approved') listingCounts[l.seller_id].approved++;
    else if (l.status === 'pending') listingCounts[l.seller_id].pending++;
    else if (l.status === 'rejected') listingCounts[l.seller_id].rejected++;
  }

  // Watchlist counts per user
  const watchlistCounts: Record<string, number> = {};
  for (const w of watchlists ?? []) {
    watchlistCounts[w.user_id] = (watchlistCounts[w.user_id] ?? 0) + 1;
  }

  // Conversation counts per buyer
  const convCounts: Record<string, number> = {};
  for (const c of conversations ?? []) {
    convCounts[c.buyer_id] = (convCounts[c.buyer_id] ?? 0) + 1;
  }

  const ONE_YEAR_AGO = new Date();
  ONE_YEAR_AGO.setFullYear(ONE_YEAR_AGO.getFullYear() - 1);

  const result = (authUsers ?? []).map(u => {
    const isDealer = dealerIds.has(u.id);
    const isAdvertiser = advertiserIds.has(u.id);
    const hasSold = !!listingCounts[u.id];
    const hasBought = (watchlistCounts[u.id] ?? 0) > 0 || (convCounts[u.id] ?? 0) > 0;
    const lastSeen = u.last_sign_in_at ? new Date(u.last_sign_in_at) : new Date(u.created_at);
    const isInactive = lastSeen < ONE_YEAR_AGO && !hasSold && !hasBought && !isDealer && !isAdvertiser;
    const isNew = !hasSold && !hasBought && !isDealer && !isAdvertiser && !isInactive;

    const roles: string[] = [];
    if (isDealer) roles.push('dealer');
    if (isAdvertiser) roles.push('advertiser');
    if (hasSold) roles.push('seller');
    if (hasBought) roles.push('buyer');
    if (isNew) roles.push('new');
    if (isInactive) roles.push('inactive');

    // Legacy single type for backwards compat
    const type = isDealer ? 'dealer' : isAdvertiser ? 'advertiser' : hasSold ? 'seller' : 'buyer';

    return {
      id: u.id,
      email: u.email ?? '',
      name: u.user_metadata?.full_name ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles,
      type,
      suspended: suspendedMap[u.id] ?? null,
      dealer: isDealer ? dealerMap[u.id] : null,
      advertiser: isAdvertiser ? advertiserMap[u.id] : null,
      listings: listingCounts[u.id] ?? null,
      watchlist_count: watchlistCounts[u.id] ?? 0,
      conversation_count: convCounts[u.id] ?? 0,
    };
  });

  return NextResponse.json({ users: result });
}

export async function PATCH(req: NextRequest) {
  const { user: adminUser, role } = await auth();
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action, reason, name, email, dealer } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();

  // Suspend
  if (action === 'suspend') {
    if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { error } = await admin.from('suspended_users').upsert({
      user_id: id,
      reason: reason ?? null,
      suspended_by: adminUser!.id,
      suspended_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Unsuspend
  if (action === 'unsuspend') {
    if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { error } = await admin.from('suspended_users').delete().eq('user_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Edit user info
  if (action === 'edit') {
    if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (name !== undefined) {
      await admin.auth.admin.updateUserById(id, { user_metadata: { full_name: name } });
    }
    if (email !== undefined) {
      await admin.auth.admin.updateUserById(id, { email });
    }
    if (dealer !== undefined) {
      const { error } = await admin.from('dealers').update(dealer).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Promote seller to dealer
  if (action === 'promote') {
    if (role !== 'superadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: authU } = await admin.auth.admin.getUserById(id);
    const slug = (dealer?.name ?? authU.user?.email ?? id).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error } = await admin.from('dealers').insert({
      id,
      slug,
      name: dealer?.name ?? authU.user?.user_metadata?.full_name ?? authU.user?.email ?? '',
      location: dealer?.location ?? '',
      state: dealer?.state ?? '',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { role } = await auth();
  if (role !== 'superadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();

  // Clean up all user data
  await Promise.all([
    admin.from('suspended_users').delete().eq('user_id', id),
    admin.from('watchlists').delete().eq('user_id', id),
    admin.from('saved_searches').delete().eq('user_id', id),
    admin.from('conversations').delete().eq('buyer_id', id),
  ]);

  // Delete their listings + images
  const { data: userListings } = await admin.from('listings').select('id, images').eq('seller_id', id);
  for (const l of userListings ?? []) {
    if (l.images?.length) {
      const paths = l.images.map((url: string) => url.split('/listing-images/')[1]).filter(Boolean);
      if (paths.length) await admin.storage.from('listing-images').remove(paths);
    }
    await admin.from('conversations').delete().eq('listing_id', l.id);
  }
  if ((userListings ?? []).length > 0) {
    await admin.from('listings').delete().eq('seller_id', id);
  }

  // Delete dealer profile if exists
  await admin.from('dealers').delete().eq('id', id);

  // Delete the auth user
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const { role } = await auth();
  if (role !== 'superadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, password, name, dealerName, location, state } = await req.json();
  if (!email || !password || !dealerName) {
    return NextResponse.json({ error: 'Email, password and dealer name are required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create auth user
  const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name || dealerName },
    email_confirm: true,
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userId = newUser.user.id;
  const slug = dealerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { error: dealerErr } = await admin.from('dealers').insert({
    id: userId,
    slug,
    name: dealerName,
    location: location ?? '',
    state: state ?? '',
  });
  if (dealerErr) return NextResponse.json({ error: dealerErr.message }, { status: 500 });

  return NextResponse.json({ success: true, userId });
}
