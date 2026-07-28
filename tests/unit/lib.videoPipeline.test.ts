import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLoggerInfo, mockLoggerError } = vi.hoisted(() => ({
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: vi.fn().mockResolvedValue(undefined) }),
}));

import { triggerListingVideo } from '@/lib/videoPipeline';

const LISTING = { id: 'l1', make: 'Ford', model: 'Mustang', year: 1970, price: 30000, images: ['https://example.com/1.jpg'] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  process.env.VPS_URL = 'https://video.garagecherries.com';
  process.env.VPS_SHARED_SECRET = 'shared-secret';
});

describe('triggerListingVideo', () => {
  it('is a no-op when VPS_URL is not configured', async () => {
    delete process.env.VPS_URL;
    await triggerListingVideo(LISTING);
    expect(fetch).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalled();
  });

  it('is a no-op when VPS_SHARED_SECRET is not configured', async () => {
    delete process.env.VPS_SHARED_SECRET;
    await triggerListingVideo(LISTING);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is a no-op when the listing has no images', async () => {
    await triggerListingVideo({ ...LISTING, images: [] });
    expect(fetch).not.toHaveBeenCalled();
    await triggerListingVideo({ ...LISTING, images: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts the listing to the VPS build-video endpoint with the shared secret', async () => {
    (fetch as any).mockResolvedValue({ ok: true });
    await triggerListingVideo(LISTING);

    expect(fetch).toHaveBeenCalledWith('https://video.garagecherries.com/build-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer shared-secret' },
      body: JSON.stringify({
        listingId: 'l1',
        title: '1970 Ford Mustang',
        price: '$30,000',
        images: LISTING.images,
      }),
    });
  });

  it('logs but does not throw when the VPS responds with a non-ok status', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 500 });
    await expect(triggerListingVideo(LISTING)).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('logs but does not throw when fetch itself throws', async () => {
    (fetch as any).mockRejectedValue(new Error('network down'));
    await expect(triggerListingVideo(LISTING)).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
