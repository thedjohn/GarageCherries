import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockTriggerListingVideo, mockLoggerInfo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockTriggerListingVideo: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/videoPipeline', () => ({ triggerListingVideo: mockTriggerListingVideo }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/admin/backfill-video-reels/route';

const LISTING = { id: 'l1', make: 'Ford', model: 'Mustang', year: 1970, price: 30000, images: ['https://example.com/1.jpg'] };

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

function makeSupabaseMock(pending: typeof LISTING[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              not: () => ({
                or: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: pending }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret';
  mockTriggerListingVideo.mockResolvedValue(undefined);
});

describe('GET /api/admin/backfill-video-reels', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    makeSupabaseMock([]);
    const res: any = await GET(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
    expect(mockTriggerListingVideo).not.toHaveBeenCalled();
  });

  it('triggers video generation for every listing missing a Reel', async () => {
    const listing2 = { ...LISTING, id: 'l2' };
    makeSupabaseMock([LISTING, listing2]);

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(mockTriggerListingVideo).toHaveBeenCalledTimes(2);
    expect(mockTriggerListingVideo).toHaveBeenCalledWith(LISTING);
    expect(mockTriggerListingVideo).toHaveBeenCalledWith(listing2);
    expect(res._data).toEqual({ ok: true, triggered: 2 });
  });

  it('is a no-op when nothing is pending', async () => {
    makeSupabaseMock([]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(mockTriggerListingVideo).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true, triggered: 0 });
  });

  it('does not let a rejected trigger call break the response', async () => {
    makeSupabaseMock([LISTING]);
    mockTriggerListingVideo.mockRejectedValue(new Error('VPS unreachable'));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, triggered: 1 });
  });
});
