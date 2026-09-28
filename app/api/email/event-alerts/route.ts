import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';
import { STATE_NAMES } from '@/lib/usStates';
import { createLogger } from '@/lib/logger';
import { upcomingWeekendRange } from '@/lib/eventDates';

const log = createLogger('api/email/event-alerts');
const MAX_EVENTS_PER_EMAIL = 8;

function formatEventDate(date: string, endDate: string | null) {
  const start = new Date(date + 'T12:00:00');
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  if (!endDate || endDate === date) return start.toLocaleDateString('en-US', opts);
  const end = new Date(endDate + 'T12:00:00');
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

// POST /api/email/event-alerts — sends the weekly "Shows Near You" email.
// Triggered by /api/cron/event-alerts every Thursday. Groups subscribers by
// state so each state's upcoming-weekend events are queried once, not once
// per subscriber.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { fridayStr, sundayStr } = upcomingWeekendRange(new Date());

  const { data: subscribers } = await admin
    .from('event_alert_subscribers')
    .select('id, email, state')
    .is('unsubscribed_at', null);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No subscribers' });
  }

  const states = [...new Set(subscribers.map(s => s.state))];
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let skippedNoEvents = 0;

  for (const state of states) {
    // Broad prefilter (multi-day events can start well before the weekend
    // and still overlap it), then the precise overlap check happens in JS --
    // same "cheap prefilter, exact filter after" pattern used for zip-radius
    // search on the /events page.
    const prefetchFrom = new Date(fridayStr);
    prefetchFrom.setDate(prefetchFrom.getDate() - 10);
    const { data: candidates } = await admin
      .from('events')
      .select('id, name, slug, date, end_date, location, state')
      .eq('status', 'approved')
      .eq('state', state)
      .gte('date', prefetchFrom.toISOString().slice(0, 10))
      .lte('date', sundayStr)
      .order('date', { ascending: true });

    const weekendEvents = (candidates ?? [])
      .filter(e => e.date <= sundayStr && (e.end_date ?? e.date) >= fridayStr)
      .slice(0, MAX_EVENTS_PER_EMAIL);

    if (weekendEvents.length === 0) { skippedNoEvents += subscribers.filter(s => s.state === state).length; continue; }

    const eventsHtml = weekendEvents.map(e => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
          <a href="https://www.garagecherries.com/events/${e.slug}" style="font-weight:700;color:#dc2626;text-decoration:none;">${e.name}</a>
          <br/>
          <span style="color:#71717a;font-size:13px;">${formatEventDate(e.date, e.end_date)} · ${e.location}, ${e.state}</span>
        </td>
      </tr>
    `).join('');

    const stateName = STATE_NAMES[state] ?? state;
    for (const sub of subscribers.filter(s => s.state === state)) {
      const unsubscribeUrl = `https://www.garagecherries.com/unsubscribe/event-alerts?id=${sub.id}`;
      const html = emailWrap(`
        <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 8px">This Weekend's Car Shows in ${stateName}</h1>
        <p style="color:#52525b;margin:0 0 16px">${weekendEvents.length} event${weekendEvents.length === 1 ? '' : 's'} happening this weekend near you.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${eventsHtml}</table>
        <a href="https://www.garagecherries.com/events?state=${state}" style="background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          See All ${stateName} Shows
        </a>
        <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">
          You're receiving this because you signed up for weekly car show alerts on GarageCherries.
          <br/>
          <a href="${unsubscribeUrl}" style="color:#a1a1aa;">Unsubscribe from these alerts</a>
        </p>
      `);
      try {
        await resend.emails.send({
          from: 'GarageCherries <noreply@garagecherries.com>',
          to: sub.email,
          subject: `🚗 This Weekend's Car Shows in ${stateName}`,
          html,
        });
        sent++;
      } catch (err) {
        log.error('Failed to send event alert email', { email: sub.email, state, error: String(err) });
      }
    }
  }

  log.info('Weekly event alerts sent', { sent, skippedNoEvents, states: states.length, totalSubscribers: subscribers.length });
  return NextResponse.json({ ok: true, sent, skippedNoEvents, statesWithEvents: states.length });
}
