import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn(async () => {}) }),
}));

import { postListingToFacebook, postEventToFacebook } from '@/lib/facebook/postToPage';

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

const listing = {
  id: 'l1', title: '1969 Dodge Charger', make: 'Dodge', model: 'Charger',
  year: 1969, price: 89500, slug: '1969-dodge-charger', images: ['https://x.com/a.jpg'],
};

const event = {
  slug: 'muscle-car-show-2026-09-01', name: 'Muscle Car Show',
  date: '2026-09-01', location: 'St. Louis', state: 'MO',
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(process.env, originalEnv);
});
afterEach(() => { global.fetch = originalFetch; });

describe('postListingToFacebook', () => {
  it('no-ops when FACEBOOK_PAGE_ID/ACCESS_TOKEN are not configured (current production state)', async () => {
    delete process.env.FACEBOOK_PAGE_ID;
    delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    vi.stubGlobal('fetch', vi.fn());
    await postListingToFacebook(listing);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts a photo when the listing has an image', async () => {
    process.env.FACEBOOK_PAGE_ID = 'page1';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ post_id: 'fb-post-1' }) }));
    await postListingToFacebook(listing);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/photos'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('posts to /feed when the listing has no images', async () => {
    process.env.FACEBOOK_PAGE_ID = 'page1';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'fb-post-2' }) }));
    await postListingToFacebook({ ...listing, images: null });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/feed'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('logs and does not throw when the Facebook API returns an error', async () => {
    process.env.FACEBOOK_PAGE_ID = 'page1';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'Bad token' } }) }));
    await expect(postListingToFacebook(listing)).resolves.not.toThrow();
  });

  it('logs and does not throw when the response body has an error field despite ok:true', async () => {
    process.env.FACEBOOK_PAGE_ID = 'page1';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ error: { message: 'Rejected' } }) }));
    await expect(postListingToFacebook(listing)).resolves.not.toThrow();
  });

  it('catches a thrown fetch error without propagating it (fire-and-forget contract)', async () => {
    process.env.FACEBOOK_PAGE_ID = 'page1';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token1';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(postListingToFacebook(listing)).resolves.not.toThrow();
  });
});

describe('postEventToFacebook', () => {
  it('no-ops when not configured', async () => {
    delete process.env.FACEBOOK_PAGE_ID;
    delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    vi.stubGlobal('fetch', vi.fn());
    await postEventToFacebook(event);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts to /feed with a formatted date', async () => {
    process.env.FACEBOOK_PAGE_ID = 'page1';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'fb-event-1' }) }));
    await postEventToFacebook(event);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/feed'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('catches a thrown fetch error without propagating it', async () => {
    process.env.FACEBOOK_PAGE_ID = 'page1';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token1';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(postEventToFacebook(event)).resolves.not.toThrow();
  });
});
