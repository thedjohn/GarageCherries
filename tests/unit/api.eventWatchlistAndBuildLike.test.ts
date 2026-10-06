import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockUserFrom, mockAdminFrom, mockRateLimit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockUserFrom })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: () => '1.2.3.4' }));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })) },
}));

import { POST as watchPost, DELETE as watchDelete } from '@/app/api/event-watchlist/route';
import { GET as likeGet, POST as likePost } from '@/app/api/build-like/route';

// Chainable query stand-in: builder methods return itself; single/maybeSingle
// and awaiting resolve to `result`. Records every call for assertions.
function chain(result: unknown, calls: string[] = []) {
  const q: any = {};
  for (const m of ['select', 'eq', 'delete', 'insert']) q[m] = vi.fn((...a: unknown[]) => { calls.push(`${m}:${JSON.stringify(a)}`); return q; });
  q.single = vi.fn(() => Promise.resolve(result));
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

describe('POST /api/event-watchlist', () => {
  const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;

  it('rate-limits per IP', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, firstBlock: true });
    const res: any = await watchPost(req({ eventId: 'e1' }));
    expect(res._status).toBe(429);
  });

  it('requires sign-in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res: any = await watchPost(req({ eventId: 'e1' }));
    expect(res._status).toBe(401);
  });

  it('requires an eventId', async () => {
    const res: any = await watchPost(req({}));
    expect(res._status).toBe(400);
  });

  it('saves an event that was not saved yet', async () => {
    const calls: string[] = [];
    mockUserFrom.mockImplementation(() => chain({ data: null }, calls));
    const res: any = await watchPost(req({ eventId: 'e1' }));
    expect(res._data).toEqual({ watching: true });
    expect(calls).toContain('insert:[{"user_id":"user-1","event_id":"e1"}]');
  });

  it('un-saves an event that was already saved (toggle)', async () => {
    const calls: string[] = [];
    mockUserFrom.mockImplementation(() => chain({ data: { id: 'w1' } }, calls));
    const res: any = await watchPost(req({ eventId: 'e1' }));
    expect(res._data).toEqual({ watching: false });
    expect(calls).toContain('eq:["id","w1"]');
  });
});

describe('DELETE /api/event-watchlist', () => {
  const req = (qs: string) => ({ url: `https://www.garagecherries.com/api/event-watchlist${qs}` }) as unknown as NextRequest;

  it('requires sign-in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res: any = await watchDelete(req('?eventId=e1'));
    expect(res._status).toBe(401);
  });

  it('requires an eventId', async () => {
    const res: any = await watchDelete(req(''));
    expect(res._status).toBe(400);
  });

  it("removes the user's saved event", async () => {
    const calls: string[] = [];
    mockUserFrom.mockImplementation(() => chain({ error: null }, calls));
    const res: any = await watchDelete(req('?eventId=e1'));
    expect(res._data).toEqual({ watching: false });
    expect(calls).toEqual(expect.arrayContaining(['eq:["user_id","user-1"]', 'eq:["event_id","e1"]']));
  });
});

describe('/api/build-like', () => {
  const getReq = (buildId: string | null, headers: Record<string, string> = { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }) => ({
    nextUrl: { searchParams: { get: (k: string) => (k === 'buildId' ? buildId : null) } },
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  }) as unknown as NextRequest;
  const postReq = (body: unknown, headers: Record<string, string> = {}) => ({
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  }) as unknown as NextRequest;

  it('GET requires a buildId', async () => {
    const res: any = await likeGet(getReq(null));
    expect(res._status).toBe(400);
  });

  it('GET reports whether this visitor liked it, plus the total count', async () => {
    mockAdminFrom
      .mockImplementationOnce(() => chain({ data: { id: 'l1' } }))
      .mockImplementationOnce(() => chain({ count: 7 }));
    const res: any = await likeGet(getReq('b1'));
    expect(res._data).toEqual({ liked: true, count: 7 });
  });

  it('GET defaults to not liked and zero when nothing is found', async () => {
    mockAdminFrom
      .mockImplementationOnce(() => chain({ data: null }))
      .mockImplementationOnce(() => chain({ count: null }));
    const res: any = await likeGet(getReq('b1', { 'x-real-ip': '8.8.8.8' }));
    expect(res._data).toEqual({ liked: false, count: 0 });
  });

  it('POST requires a buildId', async () => {
    const res: any = await likePost(postReq({}));
    expect(res._status).toBe(400);
  });

  it('POST likes a build not yet liked', async () => {
    const calls: string[] = [];
    mockAdminFrom
      .mockImplementationOnce(() => chain({ data: null }))
      .mockImplementationOnce(() => chain({}, calls))
      .mockImplementationOnce(() => chain({ count: 3 }));
    const res: any = await likePost(postReq({ buildId: 'b1' }));
    expect(res._data).toEqual({ liked: true, count: 3 });
    expect(calls.some(c => c.startsWith('insert:') && c.includes('"build_id":"b1"'))).toBe(true);
  });

  it('POST un-likes a build already liked (toggle), never storing a raw IP', async () => {
    const calls: string[] = [];
    mockAdminFrom
      .mockImplementationOnce(() => chain({ data: { id: 'l1' } }))
      .mockImplementationOnce(() => chain({}, calls))
      .mockImplementationOnce(() => chain({ count: null }));
    const res: any = await likePost(postReq({ buildId: 'b1' }, { 'x-forwarded-for': '9.9.9.9' }));
    expect(res._data).toEqual({ liked: false, count: 0 });
    expect(calls).toContain('eq:["id","l1"]');
    expect(calls.join(' ')).not.toContain('9.9.9.9');
  });
});
