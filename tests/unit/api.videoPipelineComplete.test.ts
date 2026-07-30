import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockSingle, mockEq, mockSelect, mockFrom, mockUpdateEq, mockUpdate, mockPostReelToFacebook, mockPostReelToInstagram, mockLoggerWarn } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockUpdate: vi.fn(),
  mockPostReelToFacebook: vi.fn(),
  mockPostReelToInstagram: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/facebook/postToPage', () => ({
  postListingReelToFacebook: mockPostReelToFacebook,
  postListingReelToInstagram: mockPostReelToInstagram,
}));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: mockLoggerWarn, error: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/video-pipeline/complete/route';

const LISTING = { id: 'l1', title: '1970 Ford Mustang', make: 'Ford', model: 'Mustang', year: 1970, price: 30000, images: ['https://example.com/1.jpg'] };

function makeRequest(body: unknown, authHeader?: string) {
  return {
    headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VIDEO_PIPELINE_CALLBACK_SECRET = 'callback-secret';
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') {
      return {
        select: mockSelect.mockReturnValue({ eq: mockEq.mockReturnValue({ single: mockSingle }) }),
        update: mockUpdate.mockReturnValue({ eq: mockUpdateEq }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  mockSingle.mockResolvedValue({ data: LISTING });
  mockUpdateEq.mockResolvedValue({ error: null });
});

describe('POST /api/video-pipeline/complete', () => {
  it('returns 401 without the correct callback secret', async () => {
    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('returns 400 when listingId is missing', async () => {
    const res: any = await POST(makeRequest({ success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));
    expect(res._status).toBe(400);
  });

  it('is a no-op when the job reported failure, without querying the listing', async () => {
    const res: any = await POST(makeRequest({ listingId: 'l1', success: false, error: 'ffmpeg crashed' }, 'Bearer callback-secret'));
    expect(mockFrom).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true });
  });

  it('is a no-op when success is true but videoUrl is missing', async () => {
    const res: any = await POST(makeRequest({ listingId: 'l1', success: true }, 'Bearer callback-secret'));
    expect(mockFrom).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true });
  });

  it('is a no-op when the listing no longer exists', async () => {
    mockSingle.mockResolvedValue({ data: null });
    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));
    expect(mockPostReelToFacebook).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true });
  });

  it('posts to Facebook and Instagram and stamps reel_posted_at on Facebook success', async () => {
    mockPostReelToFacebook.mockResolvedValue(true);
    mockPostReelToInstagram.mockResolvedValue(true);

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).toHaveBeenCalledWith(LISTING, 'https://x/y.mp4');
    expect(mockPostReelToInstagram).toHaveBeenCalledWith(LISTING, 'https://x/y.mp4');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ reel_posted_at: expect.any(String) }));
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'l1');
    expect(res._data).toEqual({ ok: true, fbSuccess: true });
  });

  it('does not stamp reel_posted_at when the Facebook post fails', async () => {
    mockPostReelToFacebook.mockResolvedValue(false);
    mockPostReelToInstagram.mockResolvedValue(false);

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true, fbSuccess: false });
  });

  it('does not let an Instagram failure block the Facebook success response', async () => {
    mockPostReelToFacebook.mockResolvedValue(true);
    mockPostReelToInstagram.mockRejectedValue(new Error('instagram down'));

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(res._data).toEqual({ ok: true, fbSuccess: true });
  });

  it('skips re-posting to Facebook when the listing already has reel_posted_at, without calling it again', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, reel_posted_at: '2026-07-29T00:00:00Z' } });

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ reel_posted_at: expect.any(String) }));
    expect(res._data).toEqual({ ok: true, fbSuccess: true });
  });

  it('skips re-posting to Instagram when the listing already has instagram_posted_at', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, instagram_posted_at: '2026-07-29T00:00:00Z' } });
    mockPostReelToFacebook.mockResolvedValue(true);

    await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToInstagram).not.toHaveBeenCalled();
  });

  it('still attempts every missing platform for a listing that already has some of them', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, reel_posted_at: '2026-07-29T00:00:00Z', instagram_posted_at: '2026-07-29T00:00:00Z' } });

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).not.toHaveBeenCalled();
    expect(mockPostReelToInstagram).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true, fbSuccess: true });
  });
});
