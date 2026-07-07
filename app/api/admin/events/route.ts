import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { createLogger } from '@/lib/logger';

const VALID_TYPES = ['show', 'swap-meet', 'cruise', 'auction'] as const;

export async function POST(req: NextRequest) {
  const log = createLogger('admin/events');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, date, end_date, location, state, type, description, url, featured } = body;

  if (!name?.trim() || !date || !location?.trim() || !state?.trim() || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('events').insert({
    name: name.trim(),
    date,
    end_date: end_date || null,
    location: location.trim(),
    state: state.trim().toUpperCase(),
    type,
    description: description?.trim() ?? '',
    url: url?.trim() || null,
    featured: !!featured,
  }).select().single();

  if (error) {
    log.error('Event create failed', new Error(error.message), { adminEmail: user?.email });
    await log.flush();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  log.info('Event created', { eventId: data.id, name: data.name, adminEmail: user?.email });
  await log.flush();
  return NextResponse.json({ event: data });
}

export async function PATCH(req: NextRequest) {
  const log = createLogger('admin/events');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, name, date, end_date, location, state, type, description, url, featured } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('events').update({
    name: name?.trim(),
    date,
    end_date: end_date || null,
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
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const log = createLogger('admin/events');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  return NextResponse.json({ success: true });
}
