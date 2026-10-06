import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin, mockSyncDealerFeed, mockSummarizeFeedSync } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockSyncDealerFeed: vi.fn(),
  mockSummarizeFeedSync: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin, hasRole: vi.fn((role: string, min: string) => {
  const order = ['support', 'moderator', 'admin', 'superadmin'];
  return order.indexOf(role) >= order.indexOf(min);
}) }));
vi.mock('@/app/api/cron/dealer-feed-sync/route', () => ({
  syncDealerFeed: mockSyncDealerFeed,
  summarizeFeedSync: mockSummarizeFeedSync,
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/admin/dealers/feed-sync/route';

const makeReq = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const PUSH_DEALER = { id: 'dealer-1', name: 'HaggleMe', email: 'd@x.com', feed_url: null, feed_protocol: 'sftp_incoming' };

function makeFromMock(dealer: any, updateCalls: any[] = []) {
  mockFrom.mockImplementation(() => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: dealer }) }) }),
    update: (payload: any) => { updateCalls.push(payload); return { eq: () => Promise.resolve({ error: null }) }; },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  mockRequireAdmin.mockResolvedValue('admin');
  mockSummarizeFeedSync.mockReturnValue('0 inserted, 12 updated, 3 sold, 0 skipped');
});

describe('POST /api/admin/dealers/feed-sync', () => {
  it('rejects non-admins', async () => {
    mockRequireAdmin.mockResolvedValueOnce('moderator');
    const res: any = await POST(makeReq({ dealerId: 'dealer-1' }));
    expect(res._status).toBe(401);
    expect(mockSyncDealerFeed).not.toHaveBeenCalled();
  });

  it('rejects signed-out users', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockRequireAdmin.mockResolvedValueOnce(null);
    const res: any = await POST(makeReq({ dealerId: 'dealer-1' }));
    expect(res._status).toBe(401);
  });

  it('requires a dealerId', async () => {
    const res: any = await POST(makeReq({}));
    expect(res._status).toBe(400);
  });

  it('returns 404 for an unknown dealer', async () => {
    makeFromMock(null);
    const res: any = await POST(makeReq({ dealerId: 'nope' }));
    expect(res._status).toBe(404);
  });

  it('refuses a dealer with no feed configured', async () => {
    makeFromMock({ ...PUSH_DEALER, feed_protocol: null });
    const res: any = await POST(makeReq({ dealerId: 'dealer-1' }));
    expect(res._status).toBe(400);
    expect(mockSyncDealerFeed).not.toHaveBeenCalled();
  });

  it('runs the shared sync and stamps the dealer row on success', async () => {
    const updates: any[] = [];
    makeFromMock(PUSH_DEALER, updates);
    mockSyncDealerFeed.mockResolvedValueOnce({ inserted: 0, updated: 12, markedSold: 3, skipped: 0, errors: [], unrecognizedMakes: [], sourceMtime: '2026-10-06T15:37:34.472Z' });
    const res: any = await POST(makeReq({ dealerId: 'dealer-1' }));
    expect(mockSyncDealerFeed).toHaveBeenCalledWith(expect.anything(), PUSH_DEALER, null, expect.any(Set));
    expect(res._data).toMatchObject({ ok: true, summary: '0 inserted, 12 updated, 3 sold, 0 skipped' });
    expect(updates[0]).toMatchObject({ feed_last_sync_summary: '0 inserted, 12 updated, 3 sold, 0 skipped', feed_sftp_last_received_at: '2026-10-06T15:37:34.472Z' });
    expect(updates[0].feed_last_success_at).toBeTruthy();
  });

  it('does not stamp success or the file marker when the sync had errors', async () => {
    const updates: any[] = [];
    makeFromMock(PUSH_DEALER, updates);
    mockSyncDealerFeed.mockResolvedValueOnce({ inserted: 0, updated: 0, markedSold: 0, skipped: 0, errors: ['bad header'], unrecognizedMakes: [], sourceMtime: '2026-10-06T15:37:34.472Z' });
    const res: any = await POST(makeReq({ dealerId: 'dealer-1' }));
    expect(res._data.ok).toBe(false);
    expect(updates[0].feed_last_success_at).toBeUndefined();
    expect(updates[0]).not.toHaveProperty('feed_sftp_last_received_at');
  });
});
