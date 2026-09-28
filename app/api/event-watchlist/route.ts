import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`event-watchlist:${ip}`, 60, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { eventId } = await request.json();
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('event_watchlists').select('id').eq('user_id', user.id).eq('event_id', eventId).single();

  if (existing) {
    await supabase.from('event_watchlists').delete().eq('id', existing.id);
    return NextResponse.json({ watching: false });
  }

  await supabase.from('event_watchlists').insert({ user_id: user.id, event_id: eventId });
  return NextResponse.json({ watching: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = new URL(request.url).searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

  await supabase.from('event_watchlists').delete().eq('user_id', user.id).eq('event_id', eventId);
  return NextResponse.json({ watching: false });
}
