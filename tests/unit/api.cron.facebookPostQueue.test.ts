import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockPostListingToFacebook, mockLoggerInfo, mockLoggerFlush } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockPostListingToFacebook: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerFlush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/facebook/postToPage', () => ({ postListingToFacebook: mockPostListingToFacebook }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: vi.fn(), flush: mockLoggerFlush }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/cron/facebook-post-queue/route';

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

const LISTING = { id: 'l1', title: '1970 Ford Mustang', make: 'Ford', model: 'Mustang', year: 1970, price: 30000, slug: 'mustang', images: ['https://example.com/1.jpg'], fb_post_attempts: 0 };

function makeSupabaseMock(pending: typeof LISTING[]) {
  const updateCalls: { id: string; payload: any }[] = [];
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                lt: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: pending }),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: (payload: any) => ({
          eq: (_col: string, id: string) => { updateCalls.push({ id, payload }); return Promise.resolve({ error: null }); },
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { updateCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret';
});

describe('GET /api/cron/facebook-post-queue', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    const res: any = await GET(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('posts each pending listing and stamps fb_posted_at on success', async () => {
    const { updateCalls } = makeSupabaseMock([LISTING]);
    mockPostListingToFacebook.mockResolvedValue(true);

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(mockPostListingToFacebook).toHaveBeenCalledWith(LISTING);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe('l1');
    expect(updateCalls[0].payload.fb_posted_at).toBeTruthy();
    expect(res._data).toEqual({ ok: true, checked: 1, posted: 1, gaveUp: 0 });
  });

  it('does not stamp fb_posted_at when the post fails, but increments fb_post_attempts for a later retry', async () => {
    const { updateCalls } = makeSupabaseMock([LISTING]);
    mockPostListingToFacebook.mockResolvedValue(false);

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe('l1');
    expect(updateCalls[0].payload.fb_post_attempts).toBe(1);
    expect(res._data).toEqual({ ok: true, checked: 1, posted: 0, gaveUp: 0 });
  });

  it('logs and counts a listing as given up once it reaches the max attempts', async () => {
    const nearCap = { ...LISTING, fb_post_attempts: 4 };
    makeSupabaseMock([nearCap]);
    mockPostListingToFacebook.mockResolvedValue(false);

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, checked: 1, posted: 0, gaveUp: 1 });
    expect(mockLoggerInfo).toHaveBeenCalledWith('Facebook post gave up after max attempts', { listingId: 'l1', attempts: 5 });
  });

  it('processes multiple pending listings independently', async () => {
    const listing2 = { ...LISTING, id: 'l2', title: '1965 Chevrolet Corvette' };
    const { updateCalls } = makeSupabaseMock([LISTING, listing2]);
    mockPostListingToFacebook.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0].id).toBe('l1');
    expect(updateCalls[1].id).toBe('l2');
    expect(res._data).toEqual({ ok: true, checked: 2, posted: 1, gaveUp: 0 });
  });

  it('is a no-op when nothing is pending', async () => {
    makeSupabaseMock([]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(mockPostListingToFacebook).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true, checked: 0, posted: 0, gaveUp: 0 });
  });
});
