import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/events/submit');
const VALID_TYPES = ['show', 'swap-meet', 'cruise', 'auction'] as const;

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed } = rateLimit(`events-submit:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You must be logged in to submit an event.' }, { status: 401 });

  const body = await req.json();
  const { name, date, end_date, start_time, end_time, location, state, type, description, url } = body;

  if (!name?.trim() || !date || !location?.trim() || !state?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid event type.' }, { status: 400 });
  }
  if (!/^[A-Z]{2}$/.test(state.trim().toUpperCase())) {
    return NextResponse.json({ error: 'State must be a 2-letter code.' }, { status: 400 });
  }
  if (url?.trim() && !/^https?:\/\//i.test(url.trim())) {
    return NextResponse.json({ error: 'Website URL must start with http:// or https://' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('name').eq('id', user.id).maybeSingle();

  const { data, error } = await admin.from('events').insert({
    name: name.trim(),
    date,
    end_date: end_date?.trim() || null,
    start_time: start_time?.trim() || null,
    end_time: end_time?.trim() || null,
    location: location.trim(),
    state: state.trim().toUpperCase(),
    type,
    description: description.trim(),
    url: url?.trim() || null,
    featured: false,
    status: 'pending',
    submitted_by: user.id,
    submitter_email: user.email,
    submitter_name: profile?.name ?? null,
  }).select().single();

  if (error) {
    log.error('Event submission failed', { userId: user.id, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log.info('Event submitted for review', { eventId: data.id, name: data.name, userId: user.id });
  return NextResponse.json({ success: true, eventId: data.id });
}
