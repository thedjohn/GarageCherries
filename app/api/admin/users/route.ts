import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  return { user, role };
}

export async function GET(req: NextRequest) {
  const { role } = await auth();
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Support tier cannot browse all users — they only work reported content
  if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const page       = Math.max(1, parseInt(params.get('page')  ?? '1',  10));
  const limit      = Math.min(200, Math.max(1, parseInt(params.get('limit') ?? '25', 10)));
  const roleFilter = params.get('role') ?? 'all';
  const statusFilter = params.get('status') ?? 'all';

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
    admin.from('dealers').select('id, name, location, state, since, logo, beta_expires_at'),
    admin.from('advertisers').select('id, user_id, business_name, contact_name, phone, city, state, trial_ends_at'),
    admin.from('listings').select('seller_id, status'),
    admin.from('suspended_users').select('user_id, reason, suspended_at'),
    admin.from('watchlists').select('user_id'),
    admin.from('conversations').select('buyer_id, listing_id'),
  ]);

  const dealerIds = new Set((dealers ?? []).map((d: any) => d.id));
  const dealerMap = Object.fromEntries((dealers ?? []).map((d: any) => [d.id, d]));
  const advertiserIds = new Set((advertisers ?? []).map((a: any) => a.user_id));
  const advertiserMap = Object.fromEntries((advertisers ?? []).map((a: any) => [a.user_id, a]));
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
      advertiser: isAdvertiser ? { company_name: advertiserMap[u.id]?.business_name, ...advertiserMap[u.id] } : null,
      listings: listingCounts[u.id] ?? null,
      watchlist_count: watchlistCounts[u.id] ?? 0,
      conversation_count: convCounts[u.id] ?? 0,
    };
  });

  const filtered = result.filter(u => {
    if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false;
    if (statusFilter === 'active' && u.suspended) return false;
    if (statusFilter === 'suspended' && !u.suspended) return false;
    return true;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);
  return NextResponse.json({ users: paginated, total, page, limit });
}

export async function PATCH(req: NextRequest) {
  const { user: adminUser, role } = await auth();
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action, reason, name, email, dealer, advertiser } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();

  // Warn user — sends a warning email
  if (action === 'warn') {
    if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: authData } = await admin.auth.admin.getUserById(id);
    const email = authData?.user?.email;
    if (!email) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const warningMessage = body.message?.trim() || 'Please review our community guidelines. Continued violations may result in account suspension.';
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'GarageCherries <contact-us@garagecherries.com>',
      to: email,
      subject: 'A message about your GarageCherries account',
      html: emailWrap(`
          <h2 style="font-size:20px;font-weight:800;color:#18181b;margin-bottom:16px">Account Notice</h2>
          <p style="color:#52525b;font-size:15px;line-height:1.6;margin-bottom:16px">
            Our team reviewed a reported message associated with your account and wanted to reach out.
          </p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:20px">
            <p style="color:#7f1d1d;font-size:14px;margin:0">${warningMessage}</p>
          </div>
          <p style="color:#52525b;font-size:14px;line-height:1.6">
            If you have questions, reply to this email. Thank you for being part of GarageCherries.
          </p>
      `),
    });
    return NextResponse.json({ success: true });
  }

  // Suspend
  if (action === 'suspend') {
    if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: authData } = await admin.auth.admin.getUserById(id);
    const userEmail = authData?.user?.email;
    const userName = authData?.user?.user_metadata?.full_name || 'there';
    const { error } = await admin.from('suspended_users').upsert({
      user_id: id,
      reason: reason ?? null,
      suspended_by: adminUser!.id,
      suspended_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (userEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from: 'GarageCherries <contact-us@garagecherries.com>',
        to: userEmail,
        subject: 'Your GarageCherries account has been suspended',
        html: `
          ${emailWrap(`
            <h2 style="font-size:20px;font-weight:800;color:#18181b;margin-bottom:16px">Hi ${userName}, your account has been suspended</h2>
            <p style="color:#52525b;font-size:15px;line-height:1.6;margin-bottom:16px">
              Your GarageCherries account has been suspended due to a violation of our community guidelines.
            </p>
            ${reason ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:20px">
              <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#dc2626;margin:0 0 6px">Reason</p>
              <p style="color:#7f1d1d;font-size:14px;margin:0">${reason}</p>
            </div>` : ''}
            <p style="color:#52525b;font-size:14px;line-height:1.6;margin-bottom:24px">
              If you believe this was a mistake, please contact us at
              <a href="mailto:contact-us@garagecherries.com" style="color:#dc2626">contact-us@garagecherries.com</a>
              and we will review your case.
            </p>
          `)}
        `,
      }).catch(() => {});
    }
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
    if (advertiser !== undefined) {
      // Advertisers are keyed by user_id, not id
      const { error } = await admin.from('advertisers').update(advertiser).eq('user_id', id);
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
  const { role, user } = await auth();
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
    admin.from('inquiries').delete().eq('user_id', id),
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

  // Reset any approved application(s) that created this dealer — otherwise they're left
  // stuck at status='approved' forever (the FK only nulls dealer_id, it doesn't touch status),
  // permanently blocking that email from re-applying. Must run before the dealers delete below,
  // since ON DELETE SET NULL wipes dealer_id the moment the dealer row is gone.
  await admin
    .from('dealer_applications')
    .update({
      status: 'rejected',
      rejection_note: 'Dealer account was deleted. Please reapply if you would like a new account.',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    })
    .eq('dealer_id', id)
    .eq('status', 'approved');

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
