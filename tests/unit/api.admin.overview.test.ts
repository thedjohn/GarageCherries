import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockRequireAdmin, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
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

import { GET } from '@/app/api/admin/overview/route';

function makeGetRequest() {
  return {} as unknown as NextRequest;
}

function makeSupabaseMock({ pendingRows = [] as { created_at: string }[], reportedCount = 0, views30d = 0, inquiries30d = 0, offers30d = 0, sold30d = 0, dealerRows = [] as { created_at: string }[] }) {
  let listingsCall = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') {
      listingsCall++;
      if (listingsCall === 1) {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: pendingRows }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: sold30d }) }) }) };
    }
    if (table === 'messages') {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: reportedCount }) }) };
    }
    if (table === 'listing_views') {
      return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: views30d }) }) };
    }
    if (table === 'conversations') {
      return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: inquiries30d }) }) };
    }
    if (table === 'offers') {
      return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: offers30d }) }) };
    }
    if (table === 'dealers') {
      return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ data: dealerRows }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
});

describe('GET /api/admin/overview', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });

  it('returns 403 for moderator (requires admin or above)', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(403);
  });

  it('returns 200 for admin role with pending queue, reported queue, funnel, and dealer signups trend', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const today = new Date().toISOString();
    makeSupabaseMock({
      pendingRows: [{ created_at: new Date(Date.now() - 3 * 86400000).toISOString() }, { created_at: today }],
      reportedCount: 2,
      views30d: 500, inquiries30d: 20, offers30d: 5, sold30d: 1,
      dealerRows: [{ created_at: today }],
    });

    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(200);
    expect(res._data.pendingQueue.count).toBe(2);
    expect(res._data.pendingQueue.oldestDays).toBe(3);
    expect(res._data.reportedQueue).toEqual({ count: 2 });
    expect(res._data.funnel).toEqual({ views30d: 500, inquiries30d: 20, offers30d: 5, sold30d: 1 });
    expect(res._data.dealerSignupsTrend).toHaveLength(30);
    expect(res._data.dealerSignupsTrend[29].count).toBe(1);
  });

  it('reports oldestDays as null when nothing is pending', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    makeSupabaseMock({ pendingRows: [] });

    const res: any = await GET(makeGetRequest());
    expect(res._data.pendingQueue).toEqual({ count: 0, oldestDays: null });
  });
});
