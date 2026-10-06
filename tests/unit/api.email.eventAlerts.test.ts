import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockSend, mockLogError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSend: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn(() => ({ from: mockFrom })) }));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/emailBranding', () => ({ emailWrap: (html: string) => html }));
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: mockLogError, flush: vi.fn() }) }));
vi.mock('@/lib/eventDates', () => ({ upcomingWeekendRange: () => ({ fridayStr: '2026-10-09', sundayStr: '2026-10-11' }) }));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })) },
}));

import { POST } from '@/app/api/email/event-alerts/route';

// Chainable query stand-in: every builder method returns itself, and awaiting
// it resolves to `result`.
function chain(result: unknown) {
  const q: any = {};
  for (const m of ['select', 'is', 'eq', 'gte', 'lte', 'order']) q[m] = vi.fn(() => q);
  q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
  return q;
}

function setup(subscribers: unknown[] | null, eventsByState: Record<string, unknown[]>) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'event_alert_subscribers') return chain({ data: subscribers });
    if (table === 'events') {
      const q = chain({ data: [] });
      q.eq = vi.fn((col: string, val: string) => { if (col === 'state') q.then = (res: any) => Promise.resolve({ data: eventsByState[val] ?? [] }).then(res); return q; });
      return q;
    }
    throw new Error(`Unexpected table ${table}`);
  });
}

const req = (auth?: string) => ({ headers: { get: (k: string) => (k === 'Authorization' ? auth ?? null : null) } }) as unknown as NextRequest;
const AUTH = 'Bearer admin-secret';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_API_SECRET = 'admin-secret';
  mockSend.mockResolvedValue({ data: { id: 'e1' }, error: null });
});

describe('POST /api/email/event-alerts', () => {
  it('rejects a missing or wrong secret', async () => {
    const res: any = await POST(req('Bearer nope'));
    expect(res._status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does nothing when there are no subscribers', async () => {
    setup([], {});
    const res: any = await POST(req(AUTH));
    expect(res._data).toEqual({ ok: true, sent: 0, message: 'No subscribers' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('treats a null subscriber result the same as none', async () => {
    setup(null, {});
    const res: any = await POST(req(AUTH));
    expect(res._data.sent).toBe(0);
  });

  it('emails each subscriber the weekend events for their state, with an unsubscribe link', async () => {
    setup(
      [{ id: 's1', email: 'a@x.com', state: 'MO' }, { id: 's2', email: 'b@x.com', state: 'MO' }],
      { MO: [
        { id: 'e1', name: 'Saturday Show', slug: 'saturday-show', date: '2026-10-10', end_date: null, location: 'St. Charles', state: 'MO' },
        { id: 'e2', name: 'Fall Run', slug: 'fall-run', date: '2026-10-09', end_date: '2026-10-11', location: 'Branson', state: 'MO' },
      ] },
    );
    const res: any = await POST(req(AUTH));
    expect(res._data).toMatchObject({ ok: true, sent: 2, skippedNoEvents: 0 });
    expect(mockSend).toHaveBeenCalledTimes(2);
    const first = mockSend.mock.calls[0][0];
    expect(first.to).toBe('a@x.com');
    expect(first.subject).toContain('Missouri');
    expect(first.html).toContain('Saturday Show');
    expect(first.html).toContain('2 events happening');
    expect(first.html).toContain('/unsubscribe/event-alerts?id=s1');
  });

  it('includes multi-day events that started before the weekend but overlap it, and excludes ones that ended before', async () => {
    setup([{ id: 's1', email: 'a@x.com', state: 'TX' }], { TX: [
      { id: 'e1', name: 'Week Long Rally', slug: 'rally', date: '2026-10-05', end_date: '2026-10-10', location: 'Austin', state: 'TX' },
      { id: 'e2', name: 'Already Over', slug: 'over', date: '2026-10-02', end_date: '2026-10-04', location: 'Waco', state: 'TX' },
    ] });
    await POST(req(AUTH));
    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain('Week Long Rally');
    expect(html).not.toContain('Already Over');
    expect(html).toContain('1 event happening');
  });

  it('skips subscribers whose state has no events this weekend', async () => {
    setup([{ id: 's1', email: 'a@x.com', state: 'WY' }, { id: 's2', email: 'b@x.com', state: 'WY' }], {});
    const res: any = await POST(req(AUTH));
    expect(res._data).toMatchObject({ sent: 0, skippedNoEvents: 2 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('keeps going when one email fails to send', async () => {
    setup(
      [{ id: 's1', email: 'bad@x.com', state: 'MO' }, { id: 's2', email: 'good@x.com', state: 'MO' }],
      { MO: [{ id: 'e1', name: 'Show', slug: 'show', date: '2026-10-10', end_date: '2026-10-10', location: 'X', state: 'MO' }] },
    );
    mockSend.mockRejectedValueOnce(new Error('send failed'));
    const res: any = await POST(req(AUTH));
    expect(res._data.sent).toBe(1);
    expect(mockLogError).toHaveBeenCalledWith('Failed to send event alert email', expect.objectContaining({ email: 'bad@x.com' }));
  });

  it('falls back to the state code when the state name is unknown', async () => {
    setup([{ id: 's1', email: 'a@x.com', state: 'ZZ' }], { ZZ: [{ id: 'e1', name: 'Show', slug: 'show', date: '2026-10-10', end_date: null, location: 'X', state: 'ZZ' }] });
    await POST(req(AUTH));
    expect(mockSend.mock.calls[0][0].subject).toContain('in ZZ');
  });
});
