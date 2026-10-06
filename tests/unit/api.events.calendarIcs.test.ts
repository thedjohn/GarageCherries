import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockSingle } = vi.hoisted(() => ({ mockSingle: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ single: mockSingle }) }) }) }),
  })),
}));
vi.mock('next/server', () => {
  class FakeResponse {
    body: string; status: number; headers: Map<string, string>;
    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body; this.status = init?.status ?? 200;
      this.headers = new Map(Object.entries(init?.headers ?? {}));
    }
    static json(data: unknown, init?: { status?: number }) { return new FakeResponse(JSON.stringify(data), init); }
  }
  return { NextResponse: FakeResponse };
});

import { GET } from '@/app/events/[slug]/calendar.ics/route';

const BASE = {
  id: 'ev-1', name: 'Mopars at The Rock', slug: 'mopars-at-the-rock-2026-10-31', date: '2026-10-31',
  end_date: null, start_time: null, end_time: null, street: '2152 N US Hwy 1', location: 'Rockingham',
  state: 'NC', zip: '28379', description: 'Drag racing, car show, swap meet.', url: 'https://example.com/rock',
};

async function getIcs(event: Record<string, unknown> | null) {
  mockSingle.mockResolvedValueOnce({ data: event });
  const res: any = await GET({} as NextRequest, { params: Promise.resolve({ slug: (event?.slug as string) ?? 'missing' }) });
  return res;
}
const unfold = (s: string) => s.replace(/\r\n /g, '');

beforeEach(() => mockSingle.mockReset());

describe('GET /events/[slug]/calendar.ics', () => {
  it('returns 404 for an unknown or unapproved event', async () => {
    const res = await getIcs(null);
    expect(res.status).toBe(404);
  });

  it('serves a downloadable text/calendar file', async () => {
    const res = await getIcs(BASE);
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="mopars-at-the-rock-2026-10-31.ics"');
    expect(res.body.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(res.body.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('writes an all-day event with an exclusive end date when there is no start time', async () => {
    const body = unfold((await getIcs(BASE)).body);
    expect(body).toContain('DTSTART;VALUE=DATE:20261031');
    expect(body).toContain('DTEND;VALUE=DATE:20261101');
  });

  it('spans multi-day events through the day after end_date', async () => {
    const body = unfold((await getIcs({ ...BASE, end_date: '2026-11-01' })).body);
    expect(body).toContain('DTSTART;VALUE=DATE:20261031');
    expect(body).toContain('DTEND;VALUE=DATE:20261102');
  });

  it('uses local start and end times when given', async () => {
    const body = unfold((await getIcs({ ...BASE, start_time: '08:30', end_time: '15:00' })).body);
    expect(body).toContain('DTSTART:20261031T083000');
    expect(body).toContain('DTEND:20261031T150000');
  });

  it('includes the title, full address, and links, with RFC 5545 escaping', async () => {
    const body = unfold((await getIcs({ ...BASE, name: 'Cars, Coffee; Fun' })).body);
    expect(body).toContain('SUMMARY:Cars\\, Coffee\\; Fun');
    expect(body).toContain('LOCATION:2152 N US Hwy 1\\, Rockingham\\, NC\\, 28379');
    expect(body).toContain('UID:ev-1@garagecherries.com');
    expect(body).toContain('URL:https://www.garagecherries.com/events/mopars-at-the-rock-2026-10-31');
    expect(body).toContain('Event website: https://example.com/rock');
  });

  it('folds long lines to 75 octets', async () => {
    const res = await getIcs({ ...BASE, description: 'x'.repeat(400) });
    for (const line of res.body.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
  });
});
