import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockSingle, mockEq, mockSelect, mockFrom, mockUpdateEq, mockUpdate, mockPostReelToFacebook, mockPostReelToInstagram, mockPostReelToYouTube, mockPostReelToTikTok, mockDeleteFacebookReel, mockDeleteInstagramMedia, mockDeleteYouTubeVideo, mockLoggerWarn } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockUpdate: vi.fn(),
  mockPostReelToFacebook: vi.fn(),
  mockPostReelToInstagram: vi.fn(),
  mockPostReelToYouTube: vi.fn(),
  mockPostReelToTikTok: vi.fn(),
  mockDeleteFacebookReel: vi.fn(),
  mockDeleteInstagramMedia: vi.fn(),
  mockDeleteYouTubeVideo: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/facebook/postToPage', () => ({
  postListingReelToFacebook: mockPostReelToFacebook,
  postListingReelToInstagram: mockPostReelToInstagram,
  deleteFacebookReel: mockDeleteFacebookReel,
  deleteInstagramMedia: mockDeleteInstagramMedia,
}));
vi.mock('@/lib/youtube/postShort', () => ({
  postListingReelToYouTube: mockPostReelToYouTube,
  deleteYouTubeVideo: mockDeleteYouTubeVideo,
}));
vi.mock('@/lib/tiktok/postShort', () => ({
  postListingReelToTikTok: mockPostReelToTikTok,
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
  mockPostReelToFacebook.mockResolvedValue(false);
  mockPostReelToInstagram.mockResolvedValue(false);
  mockPostReelToYouTube.mockResolvedValue(null);
  mockPostReelToTikTok.mockResolvedValue(false);
  mockDeleteFacebookReel.mockResolvedValue(true);
  mockDeleteInstagramMedia.mockResolvedValue(true);
  mockDeleteYouTubeVideo.mockResolvedValue(true);
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
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ instagram_posted_at: expect.any(String) }));
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'l1');
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: true, ytSuccess: false, ttSuccess: false });
  });

  it('does not stamp reel_posted_at when the Facebook post fails', async () => {
    mockPostReelToFacebook.mockResolvedValue(false);
    mockPostReelToInstagram.mockResolvedValue(false);

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ reel_posted_at: expect.any(String) }));
    expect(res._data).toEqual({ ok: true, fbSuccess: false, igSuccess: false, ytSuccess: false, ttSuccess: false });
  });

  it('does not let an Instagram failure block the Facebook success response', async () => {
    mockPostReelToFacebook.mockResolvedValue(true);
    mockPostReelToInstagram.mockRejectedValue(new Error('instagram down'));

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: false, ytSuccess: false, ttSuccess: false });
  });

  it('skips re-posting to Facebook when the listing already has reel_posted_at, without calling it again', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, reel_posted_at: '2026-07-29T00:00:00Z' } });

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ reel_posted_at: expect.any(String) }));
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: false, ytSuccess: false, ttSuccess: false });
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
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: true, ytSuccess: false, ttSuccess: false });
  });

  it('awaits the YouTube post and stamps youtube_posted_at and youtube_video_id before returning on success', async () => {
    mockPostReelToFacebook.mockResolvedValue(true);
    mockPostReelToYouTube.mockResolvedValue('yt-video-1');

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToYouTube).toHaveBeenCalledWith(LISTING, 'https://x/y.mp4');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ youtube_posted_at: expect.any(String), youtube_video_id: 'yt-video-1' }));
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: false, ytSuccess: true, ttSuccess: false });
  });

  it('does not stamp youtube_posted_at when the YouTube post fails', async () => {
    mockPostReelToYouTube.mockResolvedValue(null);

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ youtube_posted_at: expect.any(String) }));
    expect(res._data).toEqual({ ok: true, fbSuccess: false, igSuccess: false, ytSuccess: false, ttSuccess: false });
  });

  it('skips re-posting to YouTube when the listing already has youtube_posted_at', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, youtube_posted_at: '2026-07-29T00:00:00Z' } });

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToYouTube).not.toHaveBeenCalled();
    expect(res._data).toEqual(expect.objectContaining({ ytSuccess: true }));
  });

  it('awaits the TikTok post and stamps tiktok_posted_at before returning on success', async () => {
    mockPostReelToTikTok.mockResolvedValue(true);

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToTikTok).toHaveBeenCalledWith(LISTING, 'https://x/y.mp4', 'PUBLIC_TO_EVERYONE');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tiktok_posted_at: expect.any(String) }));
    expect(res._data).toEqual({ ok: true, fbSuccess: false, igSuccess: false, ytSuccess: false, ttSuccess: true });
  });

  it('does not let a rejected TikTok post throw or block the response', async () => {
    mockPostReelToTikTok.mockRejectedValue(new Error('unaudited_client_can_only_post_to_private_accounts'));

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ tiktok_posted_at: expect.any(String) }));
    expect(res._data).toEqual({ ok: true, fbSuccess: false, igSuccess: false, ytSuccess: false, ttSuccess: false });
  });

  it('skips re-posting to TikTok when the listing already has tiktok_posted_at', async () => {
    mockSingle.mockResolvedValue({ data: { ...LISTING, tiktok_posted_at: '2026-07-29T00:00:00Z' } });

    await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToTikTok).not.toHaveBeenCalled();
  });

  it('posts to all four platforms independently when none are already posted', async () => {
    mockPostReelToFacebook.mockResolvedValue(true);
    mockPostReelToInstagram.mockResolvedValue(true);
    mockPostReelToYouTube.mockResolvedValue('yt-video-1');
    mockPostReelToTikTok.mockResolvedValue(true);

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: true, ytSuccess: true, ttSuccess: true });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ reel_posted_at: expect.any(String) }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ instagram_posted_at: expect.any(String) }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ youtube_posted_at: expect.any(String) }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tiktok_posted_at: expect.any(String) }));
  });
});

describe('POST /api/video-pipeline/complete — refresh (per-platform staleness via price_dropped_at)', () => {
  // All three platforms posted before the price drop -- all stale.
  const REFRESH_LISTING = {
    ...LISTING,
    reel_posted_at: '2026-07-01T00:00:00Z', facebook_reel_id: 'old-fb-id',
    instagram_posted_at: '2026-07-01T00:00:00Z', instagram_media_id: 'old-ig-id',
    youtube_posted_at: '2026-07-01T00:00:00Z', youtube_video_id: 'old-yt-id',
    tiktok_posted_at: '2026-07-01T00:00:00Z',
    price_dropped_at: '2026-08-16T00:00:00Z',
  };

  it('force-reposts to Facebook/Instagram/YouTube when all three are stale', async () => {
    mockSingle.mockResolvedValue({ data: REFRESH_LISTING });
    mockPostReelToFacebook.mockResolvedValue('new-fb-id');
    mockPostReelToInstagram.mockResolvedValue('new-ig-id');
    mockPostReelToYouTube.mockResolvedValue('new-yt-id');

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).toHaveBeenCalledWith(REFRESH_LISTING, 'https://x/y.mp4');
    expect(mockPostReelToInstagram).toHaveBeenCalledWith(REFRESH_LISTING, 'https://x/y.mp4');
    expect(mockPostReelToYouTube).toHaveBeenCalledWith(REFRESH_LISTING, 'https://x/y.mp4');
    // TikTok was already posted and is never force-reposted (see the
    // "never force-reposts to TikTok" test below) -- it correctly reports
    // success without mockPostReelToTikTok being called again.
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: true, ytSuccess: true, ttSuccess: true });
  });

  it('deletes the old post on each stale platform after the new one succeeds', async () => {
    mockSingle.mockResolvedValue({ data: REFRESH_LISTING });
    mockPostReelToFacebook.mockResolvedValue('new-fb-id');
    mockPostReelToInstagram.mockResolvedValue('new-ig-id');
    mockPostReelToYouTube.mockResolvedValue('new-yt-id');

    await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockDeleteFacebookReel).toHaveBeenCalledWith('old-fb-id');
    expect(mockDeleteInstagramMedia).toHaveBeenCalledWith('old-ig-id');
    expect(mockDeleteYouTubeVideo).toHaveBeenCalledWith('old-yt-id');
  });

  it('stores the new IDs, overwriting the old ones', async () => {
    mockSingle.mockResolvedValue({ data: REFRESH_LISTING });
    mockPostReelToFacebook.mockResolvedValue('new-fb-id');
    mockPostReelToInstagram.mockResolvedValue('new-ig-id');
    mockPostReelToYouTube.mockResolvedValue('new-yt-id');

    await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ facebook_reel_id: 'new-fb-id' }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ instagram_media_id: 'new-ig-id' }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ youtube_video_id: 'new-yt-id' }));
  });

  it('does not force-repost a platform that already caught up (posted after the price drop)', async () => {
    // Facebook was already refreshed after the drop; Instagram/YouTube are still stale.
    mockSingle.mockResolvedValue({ data: { ...REFRESH_LISTING, reel_posted_at: '2026-08-17T00:00:00Z' } });
    mockPostReelToInstagram.mockResolvedValue('new-ig-id');
    mockPostReelToYouTube.mockResolvedValue('new-yt-id');

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).not.toHaveBeenCalled();
    expect(mockDeleteFacebookReel).not.toHaveBeenCalled();
    expect(mockPostReelToInstagram).toHaveBeenCalled();
    expect(mockPostReelToYouTube).toHaveBeenCalled();
    // Facebook already-caught-up reports success without being touched again.
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: true, ytSuccess: true, ttSuccess: true });
  });

  it('this is the core scenario: a platform that failed last time keeps retrying on its own next run, without the already-succeeded ones being redundantly re-posted', async () => {
    // Simulates the state *after* a prior run where Facebook/YouTube succeeded
    // (their *_posted_at is now after the drop) but Instagram failed (still
    // stale, still pointing at the old media ID).
    const partiallyRefreshed = {
      ...REFRESH_LISTING,
      reel_posted_at: '2026-08-17T00:00:00Z', facebook_reel_id: 'already-refreshed-fb-id',
      youtube_posted_at: '2026-08-17T00:00:00Z', youtube_video_id: 'already-refreshed-yt-id',
      // instagram_posted_at/instagram_media_id left at the original stale values
    };
    mockSingle.mockResolvedValue({ data: partiallyRefreshed });
    mockPostReelToInstagram.mockResolvedValue('new-ig-id');

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).not.toHaveBeenCalled();
    expect(mockPostReelToYouTube).not.toHaveBeenCalled();
    expect(mockPostReelToInstagram).toHaveBeenCalledWith(partiallyRefreshed, 'https://x/y.mp4');
    expect(mockDeleteInstagramMedia).toHaveBeenCalledWith('old-ig-id');
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: true, ytSuccess: true, ttSuccess: true });
  });

  it('never force-reposts to TikTok even when it is technically "stale" by timestamp', async () => {
    mockSingle.mockResolvedValue({ data: REFRESH_LISTING });

    await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToTikTok).not.toHaveBeenCalled();
  });

  it('does not attempt to delete an old post that never existed (a platform that was never posted to)', async () => {
    mockSingle.mockResolvedValue({ data: { ...REFRESH_LISTING, reel_posted_at: null, facebook_reel_id: null } });
    mockPostReelToFacebook.mockResolvedValue('new-fb-id');

    await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockDeleteFacebookReel).not.toHaveBeenCalled();
  });

  it('does not let a failed delete of the old post block recording the new one', async () => {
    mockSingle.mockResolvedValue({ data: REFRESH_LISTING });
    mockPostReelToFacebook.mockResolvedValue('new-fb-id');
    mockDeleteFacebookReel.mockRejectedValue(new Error('delete failed'));

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(res._data.fbSuccess).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ facebook_reel_id: 'new-fb-id' }));
  });

  it('does not treat a listing without price_dropped_at as needing a refresh (regression guard)', async () => {
    mockSingle.mockResolvedValue({ data: { ...REFRESH_LISTING, price_dropped_at: null } });

    const res: any = await POST(makeRequest({ listingId: 'l1', success: true, videoUrl: 'https://x/y.mp4' }, 'Bearer callback-secret'));

    expect(mockPostReelToFacebook).not.toHaveBeenCalled();
    expect(mockPostReelToInstagram).not.toHaveBeenCalled();
    expect(mockPostReelToYouTube).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: true, fbSuccess: true, igSuccess: true, ytSuccess: true, ttSuccess: true });
  });
});
