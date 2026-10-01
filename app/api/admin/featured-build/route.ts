import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { createLogger } from '@/lib/logger';

function revalidateShowcase() {
  revalidatePath('/showcase');
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('featured_builds')
    .select('*, garage_vehicles(year, make, model, trim, nickname, images)')
    .order('featured_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ picks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const log = createLogger('admin/featured-build');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { garage_vehicle_id, featured_date, blurb } = body;

  if (!garage_vehicle_id?.trim() || !featured_date?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('featured_builds').insert({
    garage_vehicle_id: garage_vehicle_id.trim(),
    featured_date: featured_date.trim(),
    blurb: blurb?.trim() || null,
  }).select().single();

  if (error) {
    // 23505 = unique violation on featured_date -- a real, expected user error
    // (two features for the same day), not a 500-worthy server failure.
    const status = error.code === '23505' ? 400 : 500;
    const message = error.code === '23505' ? 'A Featured Build is already set for that date.' : error.message;
    log.error('Featured build create failed', new Error(error.message), { adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: message }, { status });
  }
  log.info('Featured build created', { pickId: data.id, featuredDate: data.featured_date, adminEmail: user?.email });
  await log.flush();
  revalidateShowcase();
  return NextResponse.json({ pick: data });
}

export async function PATCH(req: NextRequest) {
  const log = createLogger('admin/featured-build');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, garage_vehicle_id, featured_date, blurb } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('featured_builds').update({
    ...(garage_vehicle_id !== undefined ? { garage_vehicle_id: garage_vehicle_id.trim() } : {}),
    ...(featured_date !== undefined ? { featured_date: featured_date.trim() } : {}),
    ...(blurb !== undefined ? { blurb: blurb?.trim() || null } : {}),
  }).eq('id', id);

  if (error) {
    const status = error.code === '23505' ? 400 : 500;
    const message = error.code === '23505' ? 'A Featured Build is already set for that date.' : error.message;
    log.error('Featured build update failed', new Error(error.message), { pickId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: message }, { status });
  }
  log.info('Featured build updated', { pickId: id, adminEmail: user?.email });
  await log.flush();
  revalidateShowcase();
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const log = createLogger('admin/featured-build');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('featured_builds').delete().eq('id', id);
  if (error) {
    log.error('Featured build delete failed', new Error(error.message), { pickId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Featured build deleted', { pickId: id, adminEmail: user?.email });
  await log.flush();
  revalidateShowcase();
  return NextResponse.json({ success: true });
}
