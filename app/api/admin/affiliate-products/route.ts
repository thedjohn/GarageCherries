import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { createLogger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('affiliate_products')
    .select('*')
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: NextRequest) {
  const log = createLogger('admin/affiliate-products');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, image_url, description, category, merchant, affiliate_url, regular_url, price, featured, display_order, active } = body;

  if (!name?.trim() || !category?.trim() || !merchant?.trim() || !affiliate_url?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('affiliate_products').insert({
    name: name.trim(),
    image_url: image_url?.trim() || null,
    description: description?.trim() ?? '',
    category: category.trim(),
    merchant: merchant.trim(),
    affiliate_url: affiliate_url.trim(),
    regular_url: regular_url?.trim() || null,
    price: price !== '' && price != null ? Number(price) : null,
    featured: !!featured,
    display_order: Number(display_order) || 0,
    active: active !== undefined ? !!active : true,
  }).select().single();

  if (error) {
    log.error('Affiliate product create failed', new Error(error.message), { adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Affiliate product created', { productId: data.id, name: data.name, adminEmail: user?.email });
  await log.flush();
  revalidatePath('/garage-gear');
  return NextResponse.json({ product: data });
}

export async function PATCH(req: NextRequest) {
  const log = createLogger('admin/affiliate-products');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, name, image_url, description, category, merchant, affiliate_url, regular_url, price, featured, display_order, active } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('affiliate_products').update({
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(image_url !== undefined ? { image_url: image_url?.trim() || null } : {}),
    ...(description !== undefined ? { description: description?.trim() ?? '' } : {}),
    ...(category !== undefined ? { category: category.trim() } : {}),
    ...(merchant !== undefined ? { merchant: merchant.trim() } : {}),
    ...(affiliate_url !== undefined ? { affiliate_url: affiliate_url.trim() } : {}),
    ...(regular_url !== undefined ? { regular_url: regular_url?.trim() || null } : {}),
    ...(price !== undefined ? { price: price !== '' && price != null ? Number(price) : null } : {}),
    ...(featured !== undefined ? { featured: !!featured } : {}),
    ...(display_order !== undefined ? { display_order: Number(display_order) || 0 } : {}),
    ...(active !== undefined ? { active: !!active } : {}),
  }).eq('id', id);

  if (error) {
    log.error('Affiliate product update failed', new Error(error.message), { productId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Affiliate product updated', { productId: id, adminEmail: user?.email });
  await log.flush();
  revalidatePath('/garage-gear');
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const log = createLogger('admin/affiliate-products');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('affiliate_products').delete().eq('id', id);
  if (error) {
    log.error('Affiliate product delete failed', new Error(error.message), { productId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Affiliate product deleted', { productId: id, adminEmail: user?.email });
  await log.flush();
  revalidatePath('/garage-gear');
  return NextResponse.json({ success: true });
}
