import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockUpdate, mockUpdateEq, mockTriggerListingVideo, mockLoggerInfo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
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

import { GET, isDue } from '@/app/api/admin/video-price-refresh/route';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

const BASE = { id: 'l1', make: 'Ford', model: 'Mustang', year: 1970, price: 27500, images: ['https://example.com/1.jpg'] };

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

function makeSupabaseMock(rows: any[], queryError?: Error) {
  mockFrom.mockImplementation((table: string) => {
    if (table !== 'listings') throw new Error(`Unexpected table: ${table}`);
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            not: () => ({
              order: () => ({
                limit: () => queryError ? Promise.reject(queryError) : Promise.resolve({ data: rows }),
              }),
            }),
          }),
        }),
      }),
      update: mockUpdate.mockReturnValue({ eq: mockUpdateEq }),
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret';
  mockTriggerListingVideo.mockResolvedValue(undefined);
  mockUpdateEq.mockResolvedValue({ error: null });
});

describe('isDue', () => {
  it('is due when a posted platform is older than the price drop', () => {
    const listing = {
      ...BASE,
      price_dropped_at: new Date(now - 1 * DAY).toISOString(),
      reel_posted_at: new Date(now - 40 * DAY).toISOString(),
      instagram_posted_at: null, youtube_posted_at: null,
      video_refresh_last_attempted_at: null,
    };
    expect(isDue(listing, now)).toBe(true);
  });

  it('is not due when every posted platform is already newer than the price drop', () => {
    const listing = {
      ...BASE,
      price_dropped_at: new Date(now - 1 * DAY).toISOString(),
      reel_posted_at: new Date(now - 1 * HOUR).toISOString(),
      instagram_posted_at: new Date(now - 1 * HOUR).toISOString(),
      youtube_posted_at: new Date(now - 1 * HOUR).toISOString(),
      video_refresh_last_attempted_at: null,
    };
    expect(isDue(listing, now)).toBe(false);
  });

  it('is not due when a platform was simply never posted (missing, not stale)', () => {
    const listing = {
      ...BASE,
      price_dropped_at: new Date(now - 1 * DAY).toISOString(),
      reel_posted_at: null, instagram_posted_at: null, youtube_posted_at: null,
      video_refresh_last_attempted_at: null,
    };
    expect(isDue(listing, now)).toBe(false);
  });

  it('is not due when a refresh was already attempted recently (debounced)', () => {
    const listing = {
      ...BASE,
      price_dropped_at: new Date(now - 1 * DAY).toISOString(),
      reel_posted_at: new Date(now - 40 * DAY).toISOString(),
      instagram_posted_at: null, youtube_posted_at: null,
      video_refresh_last_attempted_at: new Date(now - 2 * DAY).toISOString(),
    };
    expect(isDue(listing, now)).toBe(false);
  });

  it('is due again once the debounce window has passed', () => {
    const listing = {
      ...BASE,
      price_dropped_at: new Date(now - 1 * DAY).toISOString(),
      reel_posted_at: new Date(now - 40 * DAY).toISOString(),
      instagram_posted_at: null, youtube_posted_at: null,
      video_refresh_last_attempted_at: new Date(now - 8 * DAY).toISOString(),
    };
    expect(isDue(listing, now)).toBe(true);
  });

  it('is due for the specific still-stale platform even when others already caught up (the core partial-refresh scenario)', () => {
    const listing = {
      ...BASE,
      price_dropped_at: new Date(now - 1 * DAY).toISOString(),
      reel_posted_at: new Date(now - 1 * HOUR).toISOString(), // Facebook already refreshed
      youtube_posted_at: new Date(now - 1 * HOUR).toISOString(), // YouTube already refreshed
      instagram_posted_at: new Date(now - 40 * DAY).toISOString(), // Instagram still stale
      video_refresh_last_attempted_at: null,
    };
    expect(isDue(listing, now)).toBe(true);
  });
});

describe('GET /api/admin/video-price-refresh', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    makeSupabaseMock([]);
    const res: any = await GET(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
    expect(mockTriggerListingVideo).not.toHaveBeenCalled();
  });

  it('triggers video generation only for candidates that are actually due, skipping ones that are not', async () => {
    const due = { ...BASE, id: 'due-1', price_dropped_at: new Date(now - 1 * DAY).toISOString(), reel_posted_at: new Date(now - 40 * DAY).toISOString(), instagram_posted_at: null, youtube_posted_at: null, video_refresh_last_attempted_at: null };
    const notDue = { ...BASE, id: 'not-due-1', price_dropped_at: new Date(now - 1 * DAY).toISOString(), reel_posted_at: new Date(now - 1 * HOUR).toISOString(), instagram_posted_at: new Date(now - 1 * HOUR).toISOString(), youtube_posted_at: new Date(now - 1 * HOUR).toISOString(), video_refresh_last_attempted_at: null };
    makeSupabaseMock([due, notDue]);

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(mockTriggerListingVideo).toHaveBeenCalledTimes(1);
    expect(mockTriggerListingVideo).toHaveBeenCalledWith(due);
    expect(res._data).toEqual({ ok: true, triggered: 1 });
  });

  it('is a no-op when there are no candidates at all', async () => {
    makeSupabaseMock([]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(mockTriggerListingVideo).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true, triggered: 0 });
  });

  it('stamps video_refresh_last_attempted_at for each triggered listing', async () => {
    const due = { ...BASE, id: 'due-1', price_dropped_at: new Date(now - 1 * DAY).toISOString(), reel_posted_at: new Date(now - 40 * DAY).toISOString(), instagram_posted_at: null, youtube_posted_at: null, video_refresh_last_attempted_at: null };
    makeSupabaseMock([due]);

    await GET(makeRequest('Bearer cron-secret'));

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ video_refresh_last_attempted_at: expect.any(String) }));
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'due-1');
  });

  it('does not let a rejected trigger call break the response', async () => {
    const due = { ...BASE, id: 'due-1', price_dropped_at: new Date(now - 1 * DAY).toISOString(), reel_posted_at: new Date(now - 40 * DAY).toISOString(), instagram_posted_at: null, youtube_posted_at: null, video_refresh_last_attempted_at: null };
    makeSupabaseMock([due]);
    mockTriggerListingVideo.mockRejectedValue(new Error('VPS unreachable'));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, triggered: 1 });
  });

  it('returns a clean 500 instead of crashing when the query throws', async () => {
    makeSupabaseMock([], new Error('write ETIMEDOUT'));

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(mockTriggerListingVideo).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: false, error: 'Query failed' });
    expect(res._status).toBe(500);
  });

  it('caps triggered listings at the batch limit even with more due candidates', async () => {
    const manyDue = Array.from({ length: 15 }, (_, i) => ({
      ...BASE, id: `due-${i}`,
      price_dropped_at: new Date(now - 1 * DAY).toISOString(),
      reel_posted_at: new Date(now - 40 * DAY).toISOString(),
      instagram_posted_at: null, youtube_posted_at: null,
      video_refresh_last_attempted_at: null,
    }));
    makeSupabaseMock(manyDue);

    const res: any = await GET(makeRequest('Bearer cron-secret'));

    expect(mockTriggerListingVideo).toHaveBeenCalledTimes(10);
    expect(res._data).toEqual({ ok: true, triggered: 10 });
  });
});
