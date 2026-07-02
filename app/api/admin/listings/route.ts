import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { Resend } from 'resend';

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
  const page  = Math.max(1, parseInt(params.get('page')  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = admin
    .from('listings')
    .select('id,slug,title,year,make,model,price,mileage,condition,body_style,transmission,engine,color,location,state,seller_name,seller_phone,seller_email,seller_id,images,description,featured,status,rejection_reason,resubmission_note,resubmission_count,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (sellerId) query = query.eq('seller_id', sellerId);
  const { data: listings, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: listings ?? [], total: count ?? 0, page, limit });
}

export async function PATCH(req: NextRequest) {
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
            engine, color, location, state, description, seller_name, seller_phone,
            seller_email, featured, status } = body;
    const slug = `${year}-${String(make).toLowerCase().replace(/\s+/g, '-')}-${String(model).toLowerCase().replace(/\s+/g, '-')}-${id.slice(0, 8)}`;
    const { error } = await admin.from('listings').update({
      slug, title: `${year} ${make} ${model}`, year: Number(year), make, model,
      price: Number(price) || 0,
      mileage: mileage !== '' && mileage != null ? Number(mileage) : null,
      condition, body_style, transmission,
      engine: engine || null, color: color || null,
      location, state, description,
      seller_name, seller_phone, seller_email,
      featured: !!featured, status,
    }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Approve / reject — requires moderator or above
  if (!hasRole(role, 'moderator')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Fetch listing details needed for seller notification email
  const { data: listing } = await admin
    .from('listings')
    .select('title, make, model, slug, seller_email, seller_name')
    .eq('id', id)
    .single();

  const update: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
  };
  if (action === 'approve') {
    update.listed_at = new Date().toISOString();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
            <div style="background:#18181b;padding:24px;border-radius:12px 12px 0 0;">
              <p style="color:#ef4444;font-size:22px;font-weight:900;margin:0;">🍒 GarageCherries</p>
            </div>
            <div style="background:white;border:1px solid #f4f4f5;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
              <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px;">Your listing is live!</h1>
              <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Hi ${sellerName}, your listing for <strong style="color:#18181b;">${listing.title}</strong> has been approved and is now visible to buyers on GarageCherries.</p>
              <a href="${listingUrl}" style="display:block;text-align:center;background:#ef4444;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:24px;">
                View Your Listing →
              </a>
              <p style="color:#a1a1aa;font-size:12px;margin:0;">You'll receive an email whenever a buyer sends you an inquiry. You can manage your listing from your <a href="https://www.garagecherries.com/account" style="color:#71717a;">account page</a>.</p>
            </div>
          </div>
        `,
      }).catch(() => {});

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
            <div style="background:#18181b;padding:24px;border-radius:12px 12px 0 0;">
              <p style="color:#ef4444;font-size:22px;font-weight:900;margin:0;">🍒 GarageCherries</p>
            </div>
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
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
