import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockNotifyAdmin, mockLoggerInfo, mockLoggerWarn, mockLoggerFlush } = vi.hoisted(() => ({
  mockFrom:          vi.fn(),
  mockNotifyAdmin:   vi.fn(),
  mockLoggerInfo:    vi.fn(),
  mockLoggerWarn:    vi.fn(),
  mockLoggerFlush:   vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: mockLoggerWarn, error: vi.fn(), flush: mockLoggerFlush }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/cron/sitemap-health/route';

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

function makeListingsBuilder(rows: { id: string }[]) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => Promise.resolve({ data: rows })),
  };
  return builder;
}

function sitemapXmlWithUrls(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset>${urls.map(u => `<url><loc>${u}</loc></url>`).join('')}</urlset>`;
}

const DETAIL_URL_1 = 'https://www.garagecherries.com/listings/oldsmobile/cutlass/025577a3-581d-4b26-8694-7a0c1d71c65b/1982-oldsmobile-cutlass';
const DETAIL_URL_2 = 'https://www.garagecherries.com/listings/plymouth/barracuda/5522d058-cb7b-42fc-a695-5926aeb771cc/1966-plymouth-barracuda';
const MAKE_MODEL_URL = 'https://www.garagecherries.com/listings/plymouth/barracuda';
const MAKE_URL = 'https://www.garagecherries.com/listings/plymouth';

const originalFetch = global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  global.fetch = originalFetch;
});

describe('GET /api/cron/sitemap-health', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    const res: any = await GET(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('reports ok with no issues when every live listing is in the sitemap and every URL resolves', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation(() => makeListingsBuilder([{ id: '025577a3-581d-4b26-8694-7a0c1d71c65b' }, { id: '5522d058-cb7b-42fc-a695-5926aeb771cc' }]));

    const urls = [DETAIL_URL_1, DETAIL_URL_2, MAKE_MODEL_URL, MAKE_URL];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return { text: async () => sitemapXmlWithUrls(urls) } as any;
      return { status: 200 } as any;
    }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(true);
    expect(res._data.missingCount).toBe(0);
    expect(res._data.brokenCount).toBe(0);
    expect(res._data.urlCount).toBe(4);
    expect(res._data.liveListingCount).toBe(2);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalled();
  });

  it('flags a live listing missing from the sitemap and alerts the admin', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation(() => makeListingsBuilder([{ id: '025577a3-581d-4b26-8694-7a0c1d71c65b' }, { id: 'not-in-sitemap-id' }]));

    const urls = [DETAIL_URL_1];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return { text: async () => sitemapXmlWithUrls(urls) } as any;
      return { status: 200 } as any;
    }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(false);
    expect(res._data.missingCount).toBe(1);
    expect(res._data.issues[0]).toContain('not-in-sitemap-id');
    expect(mockNotifyAdmin).toHaveBeenCalledWith('Sitemap health check found issues', expect.stringContaining('not-in-sitemap-id'));
    expect(mockLoggerWarn).toHaveBeenCalled();
  });

  it('flags a broken (404/500) sitemap URL and alerts the admin', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation(() => makeListingsBuilder([{ id: '025577a3-581d-4b26-8694-7a0c1d71c65b' }]));

    const urls = [DETAIL_URL_1, MAKE_MODEL_URL];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return { text: async () => sitemapXmlWithUrls(urls) } as any;
      if (url === MAKE_MODEL_URL) return { status: 404 } as any;
      return { status: 200 } as any;
    }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(false);
    expect(res._data.brokenCount).toBe(1);
    expect(res._data.issues.join(' ')).toContain(MAKE_MODEL_URL);
    expect(mockNotifyAdmin).toHaveBeenCalled();
  });

  it('treats a network failure on a sitemap URL as broken (status 0), not a crash', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation(() => makeListingsBuilder([{ id: '025577a3-581d-4b26-8694-7a0c1d71c65b' }]));

    const urls = [DETAIL_URL_1];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return { text: async () => sitemapXmlWithUrls(urls) } as any;
      throw new Error('network down');
    }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(false);
    expect(res._data.brokenCount).toBe(1);
  });

  it('does not flag make-only or make/model URLs as missing listings (only 4-segment detail URLs count)', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation(() => makeListingsBuilder([]));

    const urls = [MAKE_URL, MAKE_MODEL_URL];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return { text: async () => sitemapXmlWithUrls(urls) } as any;
      return { status: 200 } as any;
    }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(true);
    expect(res._data.missingCount).toBe(0);
  });
});
