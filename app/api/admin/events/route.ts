import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { createLogger } from '@/lib/logger';
import { postEventToFacebook } from '@/lib/facebook/postToPage';

const VALID_TYPES = ['show', 'swap-meet', 'cruise', 'auction'] as const;

function toEventSlug(name: string, date: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + date;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const admin = createAdminClient();
  let query = admin.from('events').select('*').order('date', { ascending: true });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const log = createLogger('admin/events');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, date, end_date, start_time, end_time, location, state, type, description, url, featured } = body;

  if (!name?.trim() || !date || !location?.trim() || !state?.trim() || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('events').insert({
    name: name.trim(),
    slug: toEventSlug(name.trim(), date),
    date,
    end_date: end_date || null,
    start_time: start_time?.trim() || null,
    end_time: end_time?.trim() || null,
    location: location.trim(),
    state: state.trim().toUpperCase(),
    type,
    description: description?.trim() ?? '',
    url: url?.trim() || null,
    featured: !!featured,
    status: 'approved',
  }).select().single();

  if (error) {
    log.error('Event create failed', new Error(error.message), { adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Event created', { eventId: data.id, name: data.name, adminEmail: user?.email });
  await log.flush();
  postEventToFacebook(data).catch(() => {});
  revalidatePath('/events');
  return NextResponse.json({ event: data });
}

export async function PATCH(req: NextRequest) {
  const log = createLogger('admin/events');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action, name, date, end_date, start_time, end_time, location, state, type, description, url, featured } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();

  // approve / reject actions
  if (action === 'approve' || action === 'reject') {
    const { data: updated, error } = await admin
      .from('events')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', id)
      .select('slug, name, date, location, state')
      .single();
    if (error) {
      log.error(`Event ${action} failed`, new Error(error.message), { eventId: id, adminEmail: user?.email });
      await log.flush();
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    log.info(`Event ${action}d`, { eventId: id, adminEmail: user?.email });
    await log.flush();
    if (action === 'approve' && updated) {
      postEventToFacebook(updated).catch(() => {});
    }
    revalidatePath('/events');
    return NextResponse.json({ success: true });
  }

  // full edit
  const { error } = await admin.from('events').update({
    name: name?.trim(),
    date,
    end_date: end_date || null,
    start_time: start_time?.trim() || null,
    end_time: end_time?.trim() || null,
    location: location?.trim(),
    state: state?.trim().toUpperCase(),
    type,
    description: description?.trim() ?? '',
    url: url?.trim() || null,
    featured: !!featured,
  }).eq('id', id);

  if (error) {
    log.error('Event update failed', new Error(error.message), { eventId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Event updated', { eventId: id, adminEmail: user?.email });
  await log.flush();
  revalidatePath('/events');
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const log = createLogger('admin/events');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('events').delete().eq('id', id);
  if (error) {
    log.error('Event delete failed', new Error(error.message), { eventId: id, adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Event deleted', { eventId: id, adminEmail: user?.email });
  await log.flush();
  revalidatePath('/events');
  return NextResponse.json({ success: true });
}
