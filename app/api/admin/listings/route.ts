import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const { data: listings, error } = await admin
    .from('listings')
    .select('id,title,year,make,model,price,mileage,condition,body_style,transmission,engine,color,location,state,seller_name,seller_phone,seller_email,images,description,featured,status,created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: listings ?? [] });
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
  const update: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
  };
  if (action === 'approve') update.listed_at = new Date().toISOString();

  const { error } = await admin
    .from('listings')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
