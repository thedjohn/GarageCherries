import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockGetUserById, mockSend, mockRateLimit, mockGetClientIP, mockLoggerInfo, mockLoggerError } = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockGetUserById: vi.fn(),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
  mockLoggerInfo:  vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: vi.fn(async () => {}) }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST as newsletterPost } from '@/app/api/newsletter/subscribe/route';
import { POST as notifyWatchersPost } from '@/app/api/notify-watchers/route';
import { GET as reviewsGet, POST as reviewsPost } from '@/app/api/reviews/route';
import { POST as trackViewPost } from '@/app/api/track-view/route';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return { json: async () => body, headers: new Headers(headers) } as unknown as NextRequest;
}
function makeGetRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1' } } });
});

// ── POST /api/newsletter/subscribe ──────────────────────────────────────────

describe('POST /api/newsletter/subscribe', () => {
  it('returns 400 for an invalid email', async () => {
    const res: any = await newsletterPost(makeRequest({ email: 'not-an-email' }));
    expect(res._status).toBe(400);
  });

  it('subscribes successfully', async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    const res: any = await newsletterPost(makeRequest({ email: 'Person@Example.com' }));
    expect(res._status).toBe(200);
  });

  it('treats a duplicate email as success (23505)', async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }) });
    const res: any = await newsletterPost(makeRequest({ email: 'person@example.com' }));
    expect(res._status).toBe(200);
    expect(res._data.ok).toBe(true);
  });

  it('returns 500 on other insert errors', async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { code: 'XXXXX', message: 'db down' } }) });
    const res: any = await newsletterPost(makeRequest({ email: 'person@example.com' }));
    expect(res._status).toBe(500);
  });
});

// ── POST /api/notify-watchers ────────────────────────────────────────────────

describe('POST /api/notify-watchers', () => {
  it('returns 429 (with sent:0) when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await notifyWatchersPost(makeRequest({ carId: 'c1', oldPrice: 1000, newPrice: 500 }));
    expect(res._status).toBe(429);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await notifyWatchersPost(makeRequest({ carId: 'c1', oldPrice: 1000, newPrice: 500 }));
    expect(res._status).toBe(401);
  });

  it('returns sent:0 when the new price is not actually lower', async () => {
    const res: any = await notifyWatchersPost(makeRequest({ carId: 'c1', oldPrice: 1000, newPrice: 1200 }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('returns 403 when the caller does not own the listing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'other-dealer' } }) }) }) };
      return {};
    });
    const res: any = await notifyWatchersPost(makeRequest({ carId: 'c1', oldPrice: 1000, newPrice: 500 }));
    expect(res._status).toBe(403);
  });

  it('returns sent:0 when the car cannot be found on the second lookup', async () => {
    let listingsCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCall++;
        if (listingsCall === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'dealer-1' } }) }) }) };
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      }
      return {};
    });
    const res: any = await notifyWatchersPost(makeRequest({ carId: 'c1', oldPrice: 1000, newPrice: 500 }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('returns sent:0 when there are no watchers', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'dealer-1', title: 'Nice Car', make: 'Dodge', model: 'Charger', slug: 'x' } }) }) }) };
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      return {};
    });
    const res: any = await notifyWatchersPost(makeRequest({ carId: 'c1', oldPrice: 1000, newPrice: 500 }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('emails eligible watchers, skipping opted-out and unresolvable ones, continuing past failures', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'dealer-1', title: 'Nice Car', make: 'Dodge', model: 'Charger', slug: 'x' } }) }) }) };
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
        { user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }, { user_id: 'u4' },
      ] }) }) };
      return {};
    });
    mockGetUserById.mockImplementation((id: string) => {
      if (id === 'u1') return Promise.resolve({ data: { user: { email: 'u1@x.com', user_metadata: {} } } });
      if (id === 'u2') return Promise.resolve({ data: { user: { email: null } } }); // no email
      if (id === 'u3') return Promise.resolve({ data: { user: { email: 'u3@x.com', user_metadata: { price_drop_opt_out: true } } } }); // opted out
      return Promise.resolve({ data: { user: { email: 'u4@x.com', user_metadata: {} } } }); // will fail to send
    });
    mockSend.mockImplementation(({ to }: any) => to === 'u4@x.com' ? Promise.reject(new Error('resend down')) : Promise.resolve({ id: 'x' }));

    const res: any = await notifyWatchersPost(makeRequest({ carId: 'c1', oldPrice: 1000, newPrice: 500 }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(1);
  });
});

// ── GET/POST /api/reviews ────────────────────────────────────────────────────

describe('GET /api/reviews', () => {
  it('returns 400 when dealerId is missing', async () => {
    const res: any = await reviewsGet(makeGetRequest());
    expect(res._status).toBe(400);
  });

  it('returns reviews for a dealer', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ id: 'r1' }], error: null }) }) }) }) });
    const res: any = await reviewsGet(makeGetRequest({ dealerId: 'd1' }));
    expect(res._status).toBe(200);
    expect(res._data.reviews).toHaveLength(1);
  });

  it('returns an empty array (not an error) on a query failure', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) }) });
    const res: any = await reviewsGet(makeGetRequest({ dealerId: 'd1' }));
    expect(res._status).toBe(200);
    expect(res._data.reviews).toEqual([]);
  });
});

describe('POST /api/reviews', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1', rating: 5 }));
    expect(res._status).toBe(429);
  });

  it('returns 400 when dealerId or rating is missing', async () => {
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1' }));
    expect(res._status).toBe(400);
  });

  it.each([0, 6])('returns 400 for an out-of-range rating (%d)', async (rating) => {
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1', rating }));
    expect(res._status).toBe(400);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1', rating: 5 }));
    expect(res._status).toBe(401);
  });

  it('returns 409 when the user already reviewed this dealer', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'r1' } }) }) }) }) });
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1', rating: 5 }));
    expect(res._status).toBe(409);
  });

  it('returns 409 on a duplicate-key insert race (23505)', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }),
      insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
    }));
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1', rating: 5 }));
    expect(res._status).toBe(409);
  });

  it('returns 500 on other insert errors', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }),
      insert: vi.fn().mockResolvedValue({ error: { code: 'XXXXX', message: 'db down' } }),
    }));
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1', rating: 5 }));
    expect(res._status).toBe(500);
  });

  it('creates the review on success', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }));
    const res: any = await reviewsPost(makeRequest({ dealerId: 'd1', rating: 5, review: 'Great!', reviewerName: 'Jane' }));
    expect(res._status).toBe(200);
  });
});

// ── POST /api/track-view ─────────────────────────────────────────────────────

describe('POST /api/track-view', () => {
  it('returns ok:false when listingId or dealerId is missing', async () => {
    const res: any = await trackViewPost(makeRequest({ listingId: 'l1' }));
    expect(res._data).toEqual({ ok: false });
  });

  it('inserts a new view when not already viewed today', async () => {
    const insert = vi.fn().mockResolvedValue({});
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) }),
      insert,
    });
    const res: any = await trackViewPost(makeRequest({ listingId: 'l1', dealerId: 'd1' }, { 'x-forwarded-for': '9.9.9.9' }));
    expect(res._status).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
  });

  it('skips inserting when already viewed today (dedup)', async () => {
    const insert = vi.fn();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'v1' } }) }) }) }) }),
      insert,
    });
    const res: any = await trackViewPost(makeRequest({ listingId: 'l1', dealerId: 'd1' }));
    expect(res._status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
  });

  it('falls back to x-real-ip, then "unknown", when x-forwarded-for is absent', async () => {
    const insert = vi.fn().mockResolvedValue({});
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) }),
      insert,
    });
    const res: any = await trackViewPost(makeRequest({ listingId: 'l1', dealerId: 'd1' }, { 'x-real-ip': '8.8.8.8' }));
    expect(res._status).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
  });
});
