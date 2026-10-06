import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /events/[slug]/calendar.ics
// An .ics file for "Add to Apple Calendar" -- iPhones open it straight into
// the Calendar app with no account or sign-in, unlike the Google Calendar
// link, which needs a Google login. Most event-page visitors are on iPhones.
// Times are written as "floating" local times (no time zone), since events
// only store a plain start/end time; the calendar shows them as-is, which is
// right for someone attending a show in its own local time.

interface IcsEvent {
  id: string; name: string; slug: string; date: string; end_date?: string | null;
  start_time?: string | null; end_time?: string | null;
  street?: string | null; location: string; state: string; zip?: string | null;
  description: string; url?: string | null;
}

// RFC 5545 text escaping: backslash, semicolon, comma, and newlines.
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Lines longer than 75 octets are folded with CRLF + a space.
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Don't split a multi-byte UTF-8 character.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
    limit = 74; // continuation lines start with a space
  }
  return parts.join('\r\n ');
}

const ymd = (d: string) => d.replace(/-/g, '');
const hm = (t: string) => t.replace(':', '').slice(0, 4) + '00';

function nextDay(d: string): string {
  const dt = new Date(d + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function buildIcs(e: IcsEvent, now: Date): string {
  const address = [e.street, e.location, e.state, e.zip].filter(Boolean).join(', ');
  const pageUrl = `https://www.garagecherries.com/events/${e.slug}`;
  const details = [e.description, e.url ? `Event website: ${e.url}` : null, `Details: ${pageUrl}`].filter(Boolean).join('\n\n');

  const when: string[] = [];
  if (e.start_time) {
    when.push(`DTSTART:${ymd(e.date)}T${hm(e.start_time)}`);
    if (e.end_time) when.push(`DTEND:${ymd(e.date)}T${hm(e.end_time)}`);
  } else {
    // All-day: DTEND is exclusive, so it's the day after the last day.
    when.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`);
    when.push(`DTEND;VALUE=DATE:${ymd(nextDay(e.end_date ?? e.date))}`);
  }

  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GarageCherries//Car Show Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@garagecherries.com`,
    `DTSTAMP:${stamp}`,
    ...when,
    `SUMMARY:${esc(e.name)}`,
    `LOCATION:${esc(address)}`,
    `DESCRIPTION:${esc(details)}`,
    `URL:${pageUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from('events').select('*').eq('slug', slug).eq('status', 'approved').single();
  if (!data) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const event = data as IcsEvent;
  return new NextResponse(buildIcs(event, new Date()), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
