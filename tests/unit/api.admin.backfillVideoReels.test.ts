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

// Tier 1 ("needs a real platform") is reached via .or(...); tier 2
// ("TikTok-only stragglers") is reached via .not().not().not().is(...) --
// each call to admin.from() must build an independent chain since the
// route calls baseQuery() fresh per tier.
function makeSupabaseMock(tier1: typeof LISTING[], tier2: typeof LISTING[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table !== 'listings') throw new Error(`Unexpected table: ${table}`);
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            not: () => ({
              or: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: tier1 }),
                }),
              }),
              not: () => ({
                not: () => ({
                  not: () => ({
                    is: () => ({
                      order: () => ({
                        limit: () => Promise.resolve({ data: tier2 }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
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

  it('triggers video generation for every tier-1 listing missing a real platform', async () => {
    const listing2 = { ...LISTING, id: 'l2' };
    makeSupabaseMock([LISTING, listing2]);

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(mockTriggerListingVideo).toHaveBeenCalledTimes(2);
    expect(mockTriggerListingVideo).toHaveBeenCalledWith(LISTING);
    expect(mockTriggerListingVideo).toHaveBeenCalledWith(listing2);
    expect(res._data).toEqual({ ok: true, triggered: 2 });
  });

  it('is a no-op when nothing is pending in either tier', async () => {
    makeSupabaseMock([], []);
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

  it('fills remaining batch capacity with TikTok-only stragglers when tier 1 has room to spare', async () => {
    const strayListing = { ...LISTING, id: 'l-tiktok-only' };
    makeSupabaseMock([LISTING], [strayListing]);

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(mockTriggerListingVideo).toHaveBeenCalledTimes(2);
    expect(mockTriggerListingVideo).toHaveBeenCalledWith(LISTING);
    expect(mockTriggerListingVideo).toHaveBeenCalledWith(strayListing);
    expect(res._data).toEqual({ ok: true, triggered: 2 });
  });

  it('does not query tier 2 at all once tier 1 alone fills the batch', async () => {
    const fullBatch = Array.from({ length: 15 }, (_, i) => ({ ...LISTING, id: `l${i}` }));
    let tier2Queried = false;
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'listings') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              not: () => ({
                or: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: fullBatch }),
                  }),
                }),
                not: () => {
                  tier2Queried = true;
                  return {
                    not: () => ({ not: () => ({ is: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) }),
                  };
                },
              }),
            }),
          }),
        }),
      };
    });

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(tier2Queried).toBe(false);
    expect(mockTriggerListingVideo).toHaveBeenCalledTimes(15);
    expect(res._data).toEqual({ ok: true, triggered: 15 });
  });

  it('returns a clean 500 instead of crashing when the query throws (e.g. a DB timeout)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'listings') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              not: () => ({
                or: () => ({
                  order: () => ({
                    limit: () => Promise.reject(new Error('write ETIMEDOUT')),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(mockTriggerListingVideo).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: false, error: 'Query failed' });
    expect(res._status).toBe(500);
  });
});
