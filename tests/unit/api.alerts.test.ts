import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockAdminFrom, mockMatchAndNotify, mockLoggerInfo, mockLoggerError, mockLoggerFlush } = vi.hoisted(() => ({
  mockGetUser:        vi.fn(),
  mockFrom:           vi.fn(),
  mockAdminFrom:      vi.fn(),
  mockMatchAndNotify: vi.fn().mockResolvedValue(undefined),
  mockLoggerInfo:     vi.fn(),
  mockLoggerError:    vi.fn(),
  mockLoggerFlush:    vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock('@/lib/matchAlerts', () => ({ matchAndNotifyAlerts: mockMatchAndNotify }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: mockLoggerFlush }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST, PATCH, DELETE } from '@/app/api/alerts/route';
import { POST as matchPost } from '@/app/api/alerts/match/route';
import { GET as matchesGet } from '@/app/api/alerts/matches/route';

function makeRequest(body: Record<string, unknown>, url = 'https://x.com/api/alerts') {
  return { json: async () => body, url } as unknown as NextRequest;
}
function makeMatchRequest(body: Record<string, unknown>, authHeader?: string) {
  return {
    json: async () => body,
    headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? authHeader ?? null : null) },
  } as unknown as NextRequest;
}
function makeGetRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(process.env, originalEnv);
  mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
});

describe('GET /api/alerts', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await GET();
    expect(res._status).toBe(401);
  });

  it('returns the saved searches', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: 's1' }], error: null }) }) }) });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.searches).toHaveLength(1);
  });

  it('returns 500 on a query error', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) });
    const res: any = await GET();
    expect(res._status).toBe(500);
  });
});

describe('POST /api/alerts', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makeRequest({}));
    expect(res._status).toBe(401);
  });

  it('returns 400 when already at 10 alerts', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 10 }) }) });
    const res: any = await POST(makeRequest({ make: 'Dodge', model: 'Charger' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 with fewer than 2 criteria', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0 }) }) });
    const res: any = await POST(makeRequest({ make: 'Dodge' }));
    expect(res._status).toBe(400);
  });

  it('creates the alert with at least 2 criteria', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      }),
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 's1' }, error: null }) }) }),
    }));
    const res: any = await POST(makeRequest({ make: 'Dodge', model: 'Charger', condition: ['Excellent'] }));
    expect(res._status).toBe(200);
    expect(res._data.search.id).toBe('s1');
  });

  it('returns 400 LISTING_LIMIT-style message when the insert hits the DB-level cap (P0001)', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0 }) }),
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { code: 'P0001', message: 'limit' } }) }) }),
    }));
    const res: any = await POST(makeRequest({ make: 'Dodge', model: 'Charger' }));
    expect(res._status).toBe(400);
  });

  it('returns 500 on other insert errors', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0 }) }),
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { code: 'XXXXX', message: 'db down' } }) }) }),
    }));
    const res: any = await POST(makeRequest({ make: 'Dodge', model: 'Charger' }));
    expect(res._status).toBe(500);
  });
});

describe('PATCH /api/alerts', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await PATCH(makeRequest({ id: 's1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    const res: any = await PATCH(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('updates paused/active fields', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: eq2 }) }) });
    const res: any = await PATCH(makeRequest({ id: 's1', paused: true, active: false }));
    expect(res._status).toBe(200);
  });

  it('returns 500 when the update fails', async () => {
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) }) });
    const res: any = await PATCH(makeRequest({ id: 's1', paused: true }));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/alerts', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await DELETE(makeRequest({}, 'https://x.com/api/alerts?id=s1'));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    const res: any = await DELETE(makeRequest({}, 'https://x.com/api/alerts'));
    expect(res._status).toBe(400);
  });

  it('deletes the alert', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: eq2 }) }) });
    const res: any = await DELETE(makeRequest({}, 'https://x.com/api/alerts?id=s1'));
    expect(res._status).toBe(200);
  });

  it('returns 500 when the delete fails', async () => {
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) }) });
    const res: any = await DELETE(makeRequest({}, 'https://x.com/api/alerts?id=s1'));
    expect(res._status).toBe(500);
  });
});

describe('POST /api/alerts/match', () => {
  it('returns 401 without a valid bearer secret', async () => {
    process.env.INTERNAL_API_SECRET = 'secret123';
    const res: any = await matchPost(makeMatchRequest({ carId: 'c1' }, 'Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('returns 401 when INTERNAL_API_SECRET is not configured', async () => {
    delete process.env.INTERNAL_API_SECRET;
    const res: any = await matchPost(makeMatchRequest({ carId: 'c1' }, 'Bearer anything'));
    expect(res._status).toBe(401);
  });

  it('returns 400 when carId is missing', async () => {
    process.env.INTERNAL_API_SECRET = 'secret123';
    const res: any = await matchPost(makeMatchRequest({}, 'Bearer secret123'));
    expect(res._status).toBe(400);
  });

  it('returns 404 when the car does not exist', async () => {
    process.env.INTERNAL_API_SECRET = 'secret123';
    mockAdminFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) });
    const res: any = await matchPost(makeMatchRequest({ carId: 'c1' }, 'Bearer secret123'));
    expect(res._status).toBe(404);
  });

  it('triggers alert matching fire-and-forget on success', async () => {
    process.env.INTERNAL_API_SECRET = 'secret123';
    mockAdminFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', title: 'Nice Car', make: 'Dodge', model: 'Charger', year: 1969 } }) }) }) });
    const res: any = await matchPost(makeMatchRequest({ carId: 'c1' }, 'Bearer secret123'));
    expect(res._status).toBe(200);
    expect(mockMatchAndNotify).toHaveBeenCalledOnce();
  });

  it('logs but does not throw when matchAndNotifyAlerts rejects', async () => {
    process.env.INTERNAL_API_SECRET = 'secret123';
    mockAdminFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', title: 'Nice Car' } }) }) }) });
    mockMatchAndNotify.mockRejectedValueOnce(new Error('match failed'));
    const res: any = await matchPost(makeMatchRequest({ carId: 'c1' }, 'Bearer secret123'));
    expect(res._status).toBe(200);
    await new Promise(process.nextTick);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('GET /api/alerts/matches', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await matchesGet(makeGetRequest({ alertId: 'a1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when alertId is missing', async () => {
    const res: any = await matchesGet(makeGetRequest());
    expect(res._status).toBe(400);
  });

  it('returns 404 when the alert does not belong to this user', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }) });
    const res: any = await matchesGet(makeGetRequest({ alertId: 'a1' }));
    expect(res._status).toBe(404);
  });

  it('returns an empty list when there are no matches', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'a1' } }) }) }) }) });
    mockAdminFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) });
    const res: any = await matchesGet(makeGetRequest({ alertId: 'a1' }));
    expect(res._status).toBe(200);
    expect(res._data.listings).toEqual([]);
  });

  it('joins matches with listing details, filtering out any that no longer exist', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'a1' } }) }) }) }) });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'alert_matches') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [
          { car_id: 'c1', match_score: 0.9, created_at: '2026-01-01' },
          { car_id: 'c2-deleted', match_score: 0.8, created_at: '2026-01-02' },
        ] }) }) }) }) };
      }
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [{ id: 'c1', title: 'Nice Car' }] }) }) };
      return {};
    });
    const res: any = await matchesGet(makeGetRequest({ alertId: 'a1' }));
    expect(res._status).toBe(200);
    expect(res._data.listings).toHaveLength(1);
    expect(res._data.listings[0].id).toBe('c1');
  });
});
