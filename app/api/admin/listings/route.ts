import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { Resend } from 'resend';
import { emailHeader } from '@/lib/emailBranding';
import { createLogger } from '@/lib/logger';
import { postListingToFacebook } from '@/lib/facebook/postToPage';
import { triggerListingVideo } from '@/lib/videoPipeline';
import { submitToIndexNow } from '@/lib/indexNow';

const resend = new Resend(process.env.RESEND_API_KEY);

function toSegment(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Support tier cannot browse all listings — they only work reported content
  if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const params = req.nextUrl.searchParams;
  const sellerId = params.get('seller_id');
  const make = params.get('make');
  const model = params.get('model');
  const yearMin = params.get('yearMin');
  const yearMax = params.get('yearMax');
  const priceMin = params.get('priceMin');
  const priceMax = params.get('priceMax');
  const status = params.get('status');
  const resubmissionsOnly = params.get('resubmissionsOnly') === 'true';
  const featuredOnly = params.get('featuredOnly') === 'true';
  const sellerType = params.get('sellerType'); // 'dealer' | 'private'
  const fbPosted = params.get('fbPosted'); // 'posted' | 'not_posted'
  const expiringSoon = params.get('expiringSoon') === 'true';
  const sortBy = params.get('sortBy'); // null (default year/make/model) | 'price_asc' | 'price_desc' | 'views_desc'
  const page  = Math.max(1, parseInt(params.get('page')  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  const SELECT_COLUMNS = 'id,slug,title,year,make,model,price,mileage,condition,body_style,transmission,engine,color,fuel_type,drive_type,vin,location,state,seller_name,seller_phone,seller_email,seller_id,images,description,featured,status,rejection_reason,resubmission_note,resubmission_count,created_at,fb_posted_at,expires_at';

  // Dealer vs private-seller split requires knowing which seller_ids are
  // dealers — there's no boolean column on listings for this, so it's
  // resolved via a lightweight lookup against the (small) dealers table.
  // Resolved once, up front, so applyFilters below can stay a plain
  // synchronous function (see its comment for why that matters).
  let dealerIdsForSplit: string[] | null = null;
  if (sellerType === 'dealer' || sellerType === 'private') {
    const { data: allDealers } = await admin.from('dealers').select('id');
    dealerIdsForSplit = (allDealers ?? []).map((d: { id: string }) => d.id);
  }

  // Every optional filter, shared between the normal (DB-paginated) path below
  // and the views-sort path, which needs the full matching id list before it
  // can rank by view count -- kept in one place so the two paths can't drift.
  // Deliberately NOT async: the query builder is itself thenable (mirrors
  // Supabase's real one), so an async function returning it would have its
  // return value silently unwrapped by JS's own await machinery before the
  // caller ever gets to chain .range()/.order() onto it.
  function applyFilters(q: any) {
    if (sellerId) q = q.eq('seller_id', sellerId);
    if (make) q = q.eq('make', make);
    if (model) q = q.ilike('model', `%${model}%`);
    if (yearMin) q = q.gte('year', Number(yearMin));
    if (yearMax) q = q.lte('year', Number(yearMax));
    if (priceMin) q = q.gte('price', Number(priceMin));
    if (priceMax) q = q.lte('price', Number(priceMax));
    if (status && status !== 'all') q = q.eq('status', status);
    if (resubmissionsOnly) q = q.gt('resubmission_count', 0);
    if (featuredOnly) q = q.eq('featured', true);
    if (fbPosted === 'posted') q = q.not('fb_posted_at', 'is', null);
    if (fbPosted === 'not_posted') q = q.is('fb_posted_at', null);
    if (expiringSoon) {
      const now = new Date().toISOString();
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte('expires_at', now).lte('expires_at', weekFromNow);
    }
    if (dealerIdsForSplit !== null) {
      if (sellerType === 'dealer') {
        q = dealerIdsForSplit.length ? q.in('seller_id', dealerIdsForSplit) : q.eq('id', '00000000-0000-0000-0000-000000000000');
      } else if (dealerIdsForSplit.length) {
        q = q.not('seller_id', 'in', `(${dealerIdsForSplit.join(',')})`);
      }
    }
    return q;
  }

  let listings: any[] | null;
  let error: { message: string } | null;
  let count: number | null;

  if (sortBy === 'views_desc') {
    // View counts live in the separate listing_views table, not a column on
    // listings, so ranking by them can't be a plain .order(). Fetch every
    // matching id first (same filters, no pagination), rank by view count via
    // the same RPC the watcher-counts endpoints already use per-page, then
    // fetch just this page's rows and put them back in ranked order — an
    // .in() query doesn't preserve the order of the id array passed to it.
    let idQuery = admin.from('listings').select('id', { count: 'exact' });
    idQuery = applyFilters(idQuery);
    const { data: idRows, error: idErr, count: idCount } = await idQuery;
    if (idErr) return NextResponse.json({ error: idErr.message }, { status: 500 });

    const allIds: string[] = (idRows ?? []).map((r: { id: string }) => r.id);
    let viewsByListing: Record<string, number> = {};
    if (allIds.length) {
      const { data: viewRows } = await admin.rpc('count_listing_views', { p_listing_ids: allIds });
      viewsByListing = Object.fromEntries((viewRows ?? []).map((r: { listing_id: string; view_count: number }) => [r.listing_id, r.view_count]));
    }
    const sortedIds = [...allIds].sort((a, b) => (viewsByListing[b] ?? 0) - (viewsByListing[a] ?? 0));
    const pageIds = sortedIds.slice(from, to + 1);

    if (pageIds.length) {
      const { data: pageRows, error: pageErr } = await admin.from('listings').select(SELECT_COLUMNS).in('id', pageIds);
      if (pageErr) return NextResponse.json({ error: pageErr.message }, { status: 500 });
      const rowsById = Object.fromEntries((pageRows ?? []).map((r: any) => [r.id, r]));
      listings = pageIds.map(id => rowsById[id]).filter(Boolean);
    } else {
      listings = [];
    }
    error = null;
    count = idCount ?? allIds.length;
  } else {
    let query = admin.from('listings').select(SELECT_COLUMNS, { count: 'exact' });
    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      query = query.order('price', { ascending: sortBy === 'price_asc' });
    } else {
      query = query
        .order('year', { ascending: false })
        .order('make', { ascending: true })
        .order('model', { ascending: true });
    }
    query = applyFilters(query);
    query = query.range(from, to);
    const result = await query;
    listings = result.data;
    error = result.error;
    count = result.count;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Always-unfiltered totals for the "X pending · Y approved · Z rejected" summary —
  // computed separately from the filtered/paginated query above so applying a
  // filter doesn't make these counts misleadingly drop to whatever's on the
  // current filtered page.
  const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] = await Promise.all([
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);
  const statusCounts = { pending: pendingCount ?? 0, approved: approvedCount ?? 0, rejected: rejectedCount ?? 0 };

  // listings.seller_name/seller_phone are a snapshot taken when the listing was
  // created and never updated again, so they go stale the moment a dealer
  // renames their business (same staleness this fixed for the public listing
  // detail page). Overlay the live dealer name/phone here too, for any
  // seller_id that matches a dealer — private-seller listings have no
  // matching dealer row and keep their stored value unchanged.
  const dealerIds = [...new Set((listings ?? []).map(l => l.seller_id).filter(Boolean))];
  let dealersById: Record<string, { name: string; phone: string | null }> = {};
  if (dealerIds.length) {
    const { data: dealerRows } = await admin.from('dealers').select('id, name, phone').in('id', dealerIds);
    dealersById = Object.fromEntries((dealerRows ?? []).map(d => [d.id, { name: d.name, phone: d.phone }]));
  }
  const listingsWithLiveSellerInfo = (listings ?? []).map(l => {
    const dealer = dealersById[l.seller_id];
    if (!dealer) return l;
    return { ...l, seller_name: dealer.name ?? l.seller_name, seller_phone: dealer.phone ?? l.seller_phone };
  });

  // Full dealer list for the admin filter dropdown (distinct from dealersById
  // above, which is only the handful of dealers on the current page). Wrapped
  // defensively — this is a "nice to have" for the filter UI, not core to the
  // listings response, so a lookup failure here shouldn't fail the whole request.
  let dealerOptions: { id: string; name: string }[] = [];
  try {
    const { data: allDealerRows } = await admin.from('dealers').select('id,name').order('name');
    dealerOptions = allDealerRows ?? [];
  } catch {
    // dealerOptions stays [] — dropdown just shows no dealers this request.
  }

  return NextResponse.json({ listings: listingsWithLiveSellerInfo, total: count ?? 0, page, limit, statusCounts, dealers: dealerOptions });
}

export async function PATCH(req: NextRequest) {
  const log = createLogger('admin/listings');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();

  // Edit update — requires admin or above
  // seller_id is intentionally never updated here; listing ownership cannot be reassigned
  if (!action) {
    if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { year, make, model, price, mileage, condition, body_style, transmission,
            engine, color, fuel_type, drive_type, vin, location, state, description,
            seller_name, seller_phone, seller_email, featured, status } = body;
    const slug = `${year}-${String(make).toLowerCase().replace(/\s+/g, '-')}-${String(model).toLowerCase().replace(/\s+/g, '-')}-${id.slice(0, 8)}`;
    const { error } = await admin.from('listings').update({
      slug, title: `${year} ${make} ${model}`, year: Number(year), make, model,
      price: Number(price) || 0,
      mileage: mileage !== '' && mileage != null ? Number(mileage) : null,
      condition, body_style, transmission,
      engine: engine || null, color: color || null,
      fuel_type: fuel_type || null, drive_type: drive_type || null, vin: vin || null,
      location, state, description,
      seller_name, seller_phone, seller_email,
      featured: !!featured, status,
    }).eq('id', id);
    if (error) {
      log.error('Listing edit failed', new Error(error.message), { listingId: id, adminEmail: user?.email });
      await log.flush();
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    log.info('Listing edited', { listingId: id, adminEmail: user?.email, status });
    await log.flush();
    return NextResponse.json({ success: true });
  }

  // Manual repost to Facebook — requires admin or above. Awaited (not fire-and-forget)
  // so the UI can show the admin whether it actually succeeded.
  if (action === 'repost_facebook') {
    if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: listing } = await admin
      .from('listings')
      .select('id, title, make, model, year, price, images, slug, mileage, condition, location, state')
      .eq('id', id)
      .single();
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    const success = await postListingToFacebook(listing);
    if (success) {
      await admin.from('listings').update({ fb_posted_at: new Date().toISOString() }).eq('id', id);
      log.info('Listing manually reposted to Facebook', { listingId: id, adminEmail: user?.email });
      triggerListingVideo(listing).catch(() => {});
    } else {
      log.warn('Manual Facebook repost failed', { listingId: id, adminEmail: user?.email });
    }
    await log.flush();
    return NextResponse.json({ success });
  }

  // Approve / reject — requires moderator or above
  if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Fetch listing details needed for seller notification email and Facebook post
  const { data: listing } = await admin
    .from('listings')
    .select('id, title, make, model, year, price, images, slug, seller_email, seller_name, seller_id, mileage, condition, location, state')
    .eq('id', id)
    .single();

  const update: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
  };
  if (action === 'approve') {
    update.listed_at = new Date().toISOString();

    update.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    update.rejection_reason = null;
    update.resubmission_note = null;
  }
  if (action === 'reject') {
    const { rejection_reason } = body;
    update.rejection_reason = rejection_reason?.trim() || null;
  }

  const { error } = await admin
    .from('listings')
    .update(update)
    .eq('id', id);

  if (error) {
    log.error('Listing action failed', new Error(error.message), { listingId: id, action, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Listing action', { listingId: id, action, adminEmail: user?.email, sellerEmail: listing?.seller_email });
  await log.flush();

  // Force the sitemap to pick up the newly-approved listing immediately,
  // instead of waiting on its passive 5-minute revalidate window.
  if (action === 'approve') revalidatePath('/sitemap.xml');

  // Post to the Facebook Page now that this listing is publicly live — fire and forget
  if (listing && action === 'approve') {
    postListingToFacebook(listing)
      .then(success => { if (success) admin.from('listings').update({ fb_posted_at: new Date().toISOString() }).eq('id', id); })
      .catch(() => {});
    const indexNowUrl = `https://www.garagecherries.com/listings/${toSegment(listing.make)}/${toSegment(listing.model)}/${id}/${listing.slug}`;
    submitToIndexNow([indexNowUrl]).catch(() => {});
  }

  // Send seller notification email — fire and forget
  if (listing?.seller_email) {
    const sellerName = listing.seller_name || 'there';

    if (action === 'approve') {
      const listingUrl = `https://www.garagecherries.com/listings/${toSegment(listing.make)}/${toSegment(listing.model)}/${id}/${listing.slug}`;
      resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: listing.seller_email,
        subject: `Your listing is live — ${listing.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            ${emailHeader}
            <div style="background:white;border:1px solid #f4f4f5;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
              <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px;">Your listing is live!</h1>
              <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${sellerName}, your listing for <strong style="color:#18181b;">${listing.title}</strong> has been approved and is now visible to buyers on GarageCherries.</p>
              <a href="${listingUrl}" style="display:block;text-align:center;background:#ef4444;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:24px;">
                View Your Listing →
              </a>
              <p style="color:#a1a1aa;font-size:12px;margin:0;">You'll receive an email when a buyer first contacts you about this listing. You can manage your listing from your <a href="https://www.garagecherries.com/account" style="color:#71717a;">account page</a>.</p>
            </div>
          </div>
        `,
      }).then(() => {
        log.info('Approval email sent', { listingId: id, sellerEmail: listing.seller_email });
        void log.flush();
      }).catch((err: unknown) => {
        log.error('Approval email failed', new Error(String(err)), { listingId: id, sellerEmail: listing.seller_email });
        void log.flush();
      });

      // Trigger alert matching (internal — requires secret)
      const origin = req.nextUrl.origin;
      fetch(`${origin}/api/alerts/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET ?? ''}`,
        },
        body: JSON.stringify({ carId: id }),
      }).catch(() => {});

    } else if (action === 'reject') {
      const reason = body.rejection_reason?.trim();
      resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: listing.seller_email,
        subject: `Your listing needs attention — ${listing.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            ${emailHeader}
            <div style="background:white;border:1px solid #f4f4f5;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
              <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px;">Your listing wasn't approved</h1>
              <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${sellerName}, your listing for <strong style="color:#18181b;">${listing.title}</strong> needs a few changes before it can go live.</p>
              ${reason ? `
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin-bottom:24px;">
                <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#dc2626;margin:0 0 8px;">Reason</p>
                <p style="font-size:14px;color:#7f1d1d;margin:0;">${reason}</p>
              </div>` : ''}
              <a href="https://www.garagecherries.com/account?tab=listings" style="display:block;text-align:center;background:#ef4444;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:24px;">
                Fix &amp; Resubmit →
              </a>
              <p style="color:#a1a1aa;font-size:12px;margin:0;">Once you've made the changes, click "Fix &amp; Resubmit" on your listing and it will go back into the review queue.</p>
            </div>
          </div>
        `,
      }).then(() => {
        log.info('Rejection email sent', { listingId: id, sellerEmail: listing.seller_email });
        void log.flush();
      }).catch((err: unknown) => {
        log.error('Rejection email failed', new Error(String(err)), { listingId: id, sellerEmail: listing.seller_email });
        void log.flush();
      });
    }
  } else {
    log.warn('Skipped seller email — no seller_email on listing', { listingId: id, action });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const log = createLogger('admin/listings');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (role !== 'superadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();

  // Fetch images before deleting so we can clean up storage
  const { data: listing } = await admin
    .from('listings')
    .select('images')
    .eq('id', id)
    .single();

  // Delete from storage
  if (listing?.images?.length) {
    const paths = listing.images.map((url: string) => {
      const parts = url.split('/listing-images/');
      return parts[1] ?? '';
    }).filter(Boolean);
    if (paths.length) {
      await admin.storage.from('listing-images').remove(paths);
    }
  }

  // Delete conversations linked to this listing
  await admin.from('conversations').delete().eq('listing_id', id);

  // Delete the listing
  const { error } = await admin.from('listings').delete().eq('id', id);
  if (error) {
    log.error('Listing delete failed', new Error(error.message), { listingId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Listing deleted', { listingId: id, adminEmail: user?.email });
  await log.flush();

  return NextResponse.json({ success: true });
}
