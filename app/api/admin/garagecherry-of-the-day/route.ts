import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { createLogger } from '@/lib/logger';

function revalidateCarOfTheDay() {
  revalidatePath('/car-of-the-day');
  revalidatePath('/car-of-the-day/archive');
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('garagecherry_of_the_day')
    .select('*, listings(title, year, make, model, price, images, slug)')
    .order('featured_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ picks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const log = createLogger('admin/garagecherry-of-the-day');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { listing_id, featured_date, short_description, interesting_facts, instagram_caption, instagram_reel_caption, hashtags } = body;

  if (!listing_id?.trim() || !featured_date?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('garagecherry_of_the_day').insert({
    listing_id: listing_id.trim(),
    featured_date: featured_date.trim(),
    short_description: short_description?.trim() || null,
    interesting_facts: interesting_facts?.trim() || null,
    instagram_caption: instagram_caption?.trim() || null,
    instagram_reel_caption: instagram_reel_caption?.trim() || null,
    hashtags: hashtags?.trim() || null,
  }).select().single();

  if (error) {
    // 23505 = unique violation on featured_date -- a real, expected user error
    // (two picks for the same day), not a 500-worthy server failure.
    const status = error.code === '23505' ? 400 : 500;
    const message = error.code === '23505' ? 'A GarageCherry of the Day is already set for that date.' : error.message;
    log.error('GarageCherry of the Day create failed', new Error(error.message), { adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: message }, { status });
  }
  log.info('GarageCherry of the Day created', { pickId: data.id, featuredDate: data.featured_date, adminEmail: user?.email });
  await log.flush();
  revalidateCarOfTheDay();
  return NextResponse.json({ pick: data });
}

export async function PATCH(req: NextRequest) {
  const log = createLogger('admin/garagecherry-of-the-day');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, listing_id, featured_date, short_description, interesting_facts, instagram_caption, instagram_reel_caption, hashtags } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('garagecherry_of_the_day').update({
    ...(listing_id !== undefined ? { listing_id: listing_id.trim() } : {}),
    ...(featured_date !== undefined ? { featured_date: featured_date.trim() } : {}),
    ...(short_description !== undefined ? { short_description: short_description?.trim() || null } : {}),
    ...(interesting_facts !== undefined ? { interesting_facts: interesting_facts?.trim() || null } : {}),
    ...(instagram_caption !== undefined ? { instagram_caption: instagram_caption?.trim() || null } : {}),
    ...(instagram_reel_caption !== undefined ? { instagram_reel_caption: instagram_reel_caption?.trim() || null } : {}),
    ...(hashtags !== undefined ? { hashtags: hashtags?.trim() || null } : {}),
  }).eq('id', id);

  if (error) {
    const status = error.code === '23505' ? 400 : 500;
    const message = error.code === '23505' ? 'A GarageCherry of the Day is already set for that date.' : error.message;
    log.error('GarageCherry of the Day update failed', new Error(error.message), { pickId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: message }, { status });
  }
  log.info('GarageCherry of the Day updated', { pickId: id, adminEmail: user?.email });
  await log.flush();
  revalidateCarOfTheDay();
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const log = createLogger('admin/garagecherry-of-the-day');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('garagecherry_of_the_day').delete().eq('id', id);
  if (error) {
    log.error('GarageCherry of the Day delete failed', new Error(error.message), { pickId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('GarageCherry of the Day deleted', { pickId: id, adminEmail: user?.email });
  await log.flush();
  revalidateCarOfTheDay();
  return NextResponse.json({ success: true });
}
