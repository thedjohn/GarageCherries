import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockSingle, mockUpdate, mockUpdateEq, mockIsAuthorized, mockDeleteVideos, mockSubmitToIndexNow, mockAfter } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSingle: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockIsAuthorized: vi.fn(),
  mockDeleteVideos: vi.fn(),
  mockSubmitToIndexNow: vi.fn().mockResolvedValue(undefined),
  mockAfter: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: mockSingle }) }),
      update: mockUpdate.mockReturnValue({ eq: mockUpdateEq }),
    }),
  })),
}));
vi.mock('@/lib/dealerAuth', () => ({ isAuthorizedForSeller: mockIsAuthorized }));
vi.mock('@/lib/deleteListingVideos', () => ({ deleteListingVideos: mockDeleteVideos }));
vi.mock('@/lib/indexNow', () => ({ submitToIndexNow: mockSubmitToIndexNow }));
vi.mock('next/server', () => ({
  after: mockAfter,
  NextResponse: { json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })) },
}));

import { POST } from '@/app/api/listings/[id]/remove/route';

const LISTING = {
  id: 'l1', seller_id: 'u1', status: 'approved', is_sold: false, is_feed_managed: false,
  make: 'Ford', model: 'Ranger XLT', slug: '2019-ford-ranger-xlt', youtube_video_id: 'yt1', facebook_reel_id: null, instagram_media_id: null,
};
const req = {} as NextRequest;
const params = { params: Promise.resolve({ id: 'l1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  mockSingle.mockResolvedValue({ data: LISTING });
  mockIsAuthorized.mockResolvedValue(true);
  mockUpdateEq.mockResolvedValue({ error: null });
  mockDeleteVideos.mockResolvedValue(undefined);
});

describe('POST /api/listings/[id]/remove', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(req, params);
    expect(res._status).toBe(401);
  });

  it('returns 403 when the listing is missing or belongs to someone else', async () => {
    mockIsAuthorized.mockResolvedValue(false);
    const res: any = await POST(req, params);
    expect(res._status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('refuses a listing that is already removed or sold', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, status: 'removed' } });
    expect(((await POST(req, params)) as any)._status).toBe(400);
    mockSingle.mockResolvedValue({ data: { ...LISTING, is_sold: true } });
    expect(((await POST(req, params)) as any)._status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('refuses feed-managed dealer listings', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, is_feed_managed: true } });
    const res: any = await POST(req, params);
    expect(res._status).toBe(400);
    expect(res._data.error).toMatch(/feed/i);
  });

  it('sets the listing to removed (not deleted), cleans up its videos and tells Bing', async () => {
    const res: any = await POST(req, params);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'removed' });
    expect(mockDeleteVideos).toHaveBeenCalledWith(expect.anything(), 'l1', LISTING);
    expect(mockSubmitToIndexNow).toHaveBeenCalledWith(['https://www.garagecherries.com/listings/ford/ranger-xlt/l1/2019-ford-ranger-xlt']);
    expect(res._data).toEqual({ ok: true });
  });

  it('does not notify Bing for a listing that was never live', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, status: 'pending' } });
    await POST(req, params);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'removed' });
    expect(mockSubmitToIndexNow).not.toHaveBeenCalled();
  });

  it('returns 500 when the update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'db down' } });
    const res: any = await POST(req, params);
    expect(res._status).toBe(500);
    expect(mockDeleteVideos).not.toHaveBeenCalled();
  });
});
