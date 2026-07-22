import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockSyncDealerFeed, mockSummarizeFeedSync } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSyncDealerFeed: vi.fn(),
  mockSummarizeFeedSync: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/app/api/cron/dealer-feed-sync/route', () => ({
  syncDealerFeed: mockSyncDealerFeed,
  summarizeFeedSync: mockSummarizeFeedSync,
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/dealer/feed-sync/route';

function makeReq() {
  return {} as unknown as NextRequest;
}

const DEALER_ROW = { id: 'dealer-1', name: 'Dealer', phone: '555', email: 'd@x.com', location: 'Tampa', state: 'FL', feed_url: 'https://example.com/feed.csv' };

function makeFromMock(dealerLookup: any, updateCalls: any[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: dealerLookup }) }) }),
        update: (payload: any) => { updateCalls.push(payload); return { eq: () => Promise.resolve({ error: null }) }; },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1' } } });
  mockSummarizeFeedSync.mockReturnValue('1 inserted, 0 updated, 0 sold, 0 skipped');
});

describe('POST /api/dealer/feed-sync', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makeReq());
    expect(res._status).toBe(401);
  });

  it('returns 403 when the authenticated user has no dealer account', async () => {
    makeFromMock(null);
    const res: any = await POST(makeReq());
    expect(res._status).toBe(403);
  });

  it('returns 400 when the dealer has no feed URL configured', async () => {
    makeFromMock({ ...DEALER_ROW, feed_url: null });
    const res: any = await POST(makeReq());
    expect(res._status).toBe(400);
    expect(mockSyncDealerFeed).not.toHaveBeenCalled();
  });

  it("runs the shared sync against the dealer's own feed and stamps the dealer row", async () => {
    const updateCalls: any[] = [];
    makeFromMock(DEALER_ROW, updateCalls);
    mockSyncDealerFeed.mockResolvedValue({ inserted: 1, updated: 0, markedSold: 0, skipped: 0, errors: [], unrecognizedMakes: [] });

    const res: any = await POST(makeReq());
    expect(mockSyncDealerFeed).toHaveBeenCalledWith(expect.anything(), DEALER_ROW, DEALER_ROW.feed_url, expect.any(Set));
    expect(res._status).toBe(200);
    expect(res._data.ok).toBe(true);
    expect(res._data.summary).toBe('1 inserted, 0 updated, 0 sold, 0 skipped');
    expect(updateCalls[0].feed_last_synced_at).toBeTruthy();
    expect(updateCalls[0].feed_last_sync_summary).toBe('1 inserted, 0 updated, 0 sold, 0 skipped');
  });

  it('reports ok:false when the sync result has errors', async () => {
    makeFromMock(DEALER_ROW);
    mockSyncDealerFeed.mockResolvedValue({ inserted: 0, updated: 0, markedSold: 0, skipped: 0, errors: ['Could not fetch feed: 500'], unrecognizedMakes: [] });
    mockSummarizeFeedSync.mockReturnValue('Error: Could not fetch feed: 500');

    const res: any = await POST(makeReq());
    expect(res._data.ok).toBe(false);
  });
});
