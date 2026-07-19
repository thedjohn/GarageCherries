import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockRequireAdmin, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser:      vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockFrom:         vi.fn(),
  mockRpc:          vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock('@/lib/admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/admin')>('@/lib/admin');
  return { ...actual, requireAdmin: mockRequireAdmin };
});

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/admin/watcher-counts/route';

function makeGetRequest(url: string) {
  return { url } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
});

describe('GET /api/admin/watcher-counts', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await GET(makeGetRequest('https://x.com/api/admin/watcher-counts?carIds=c1'));
    expect(res._status).toBe(401);
  });

  it('returns 403 for support role', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    const res: any = await GET(makeGetRequest('https://x.com/api/admin/watcher-counts?carIds=c1'));
    expect(res._status).toBe(403);
  });

  it('returns empty counts when carIds is missing', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await GET(makeGetRequest('https://x.com/api/admin/watcher-counts'));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ views: {}, totalWatchers: {} });
  });

  it('computes view and watcher counts for any listing, without an ownership check', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'watchlists') return {
        select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [
          { car_id: 'c1' }, { car_id: 'c1' }, { car_id: 'c2' },
        ] }) }),
      };
      return {};
    });
    mockRpc.mockResolvedValue({ data: [{ listing_id: 'c1', view_count: 3 }] });
    const res: any = await GET(makeGetRequest('https://x.com/api/admin/watcher-counts?carIds=c1,c2,c3'));
    expect(res._status).toBe(200);
    expect(res._data.totalWatchers).toEqual({ c1: 2, c2: 1, c3: 0 });
    expect(res._data.views).toEqual({ c1: 3, c2: 0, c3: 0 });
    expect(mockRpc).toHaveBeenCalledWith('count_listing_views', { p_listing_ids: ['c1', 'c2', 'c3'] });
  });

  it('correctly counts views beyond what a raw 1000-row select would return (regression guard)', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [] }) }) };
      return {};
    });
    // The whole point of the RPC is that Postgres aggregates server-side, so a
    // count larger than Supabase's 1000-row default select cap is returned correctly.
    mockRpc.mockResolvedValue({ data: [{ listing_id: 'c1', view_count: 1293 }] });
    const res: any = await GET(makeGetRequest('https://x.com/api/admin/watcher-counts?carIds=c1'));
    expect(res._data.views).toEqual({ c1: 1293 });
  });
});
