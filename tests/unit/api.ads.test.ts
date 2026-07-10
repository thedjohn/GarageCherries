import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRpc, mockRateLimit, mockGetClientIP } = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockRpc:         vi.fn().mockResolvedValue({}),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET as adsServeGet } from '@/app/api/ads/serve/route';
import { POST as adsTrackPost } from '@/app/api/ads/track/route';
import { GET as advertiserAdsGet, POST as advertiserAdsPost, DELETE as advertiserAdsDelete } from '@/app/api/advertiser/ads/route';

function makeGetRequest(url: string) {
  return { url } as unknown as NextRequest;
}
function makeRequest(body: Record<string, unknown>, url?: string) {
  return { json: async () => body, url } as unknown as NextRequest;
}

const FUTURE = '2099-01-01T00:00:00Z';
const PAST = '2020-01-01T00:00:00Z';

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'advertiser-user-1' } } });
});

// ── GET /api/ads/serve ───────────────────────────────────────────────────────

describe('GET /api/ads/serve', () => {
  it('returns ad:null when there are no active advertisers', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) });
    const res: any = await adsServeGet(makeGetRequest('https://x.com/api/ads/serve?state=MO'));
    expect(res._data).toEqual({ ad: null });
  });

  it('excludes advertisers with an expired or missing trial', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
      { id: 'a1', state: 'MO', tier: 'statewide', radius_miles: 9999, trial_ends_at: PAST },
      { id: 'a2', state: 'MO', tier: 'statewide', radius_miles: 9999, trial_ends_at: null },
    ] }) }) });
    const res: any = await adsServeGet(makeGetRequest('https://x.com/api/ads/serve?state=MO'));
    expect(res._data).toEqual({ ad: null });
  });

  it('includes a statewide advertiser regardless of viewer state', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'a1', state: 'CA', tier: 'statewide', radius_miles: 9999, trial_ends_at: FUTURE }] }),
          }),
        };
      }
      if (table === 'ads') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'ad1', advertiser_id: 'a1' } }) }) }) }) }) }) };
      if (table === 'ad_events') return { insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    // Second call to 'advertisers' (business name lookup) needs a different shape — handle via call counting
    let advertisersCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        advertisersCall++;
        if (advertisersCall === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'a1', state: 'CA', tier: 'statewide', radius_miles: 9999, trial_ends_at: FUTURE }] }) }) };
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { business_name: 'Ads Co', city: 'LA', state: 'CA', category: 'insurance' } }) }) }) };
      }
      if (table === 'ads') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'ad1', advertiser_id: 'a1' } }) }) }) }) }) }) };
      if (table === 'ad_events') return { insert: vi.fn().mockResolvedValue({}) };
      return {};
    });

    const res: any = await adsServeGet(makeGetRequest('https://x.com/api/ads/serve?state=MO'));
    expect(res._data.ad.id).toBe('ad1');
    expect(res._data.ad.business_name).toBe('Ads Co');
    expect(mockRpc).toHaveBeenCalledWith('inc_ad_impressions', { ad_id: 'ad1' });
  });

  it('treats every non-statewide advertiser as eligible when no viewer state param is given at all', async () => {
    let advertisersCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        advertisersCall++;
        if (advertisersCall === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'a1', state: 'MO', tier: 'metro', radius_miles: 30, trial_ends_at: FUTURE }] }) }) };
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { business_name: 'Local Co', city: 'STL', state: 'MO', category: 'other' } }) }) }) };
      }
      if (table === 'ads') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'ad1', advertiser_id: 'a1' } }) }) }) }) }) }) };
      if (table === 'ad_events') return { insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    // `!state` short-circuits the radius check entirely (`!state || !viewerCentroid` branch
    // returns `!state || a.state === state`, and `!state` is already true) — every
    // non-statewide advertiser passes when no state param is present at all.
    const res: any = await adsServeGet(makeGetRequest('https://x.com/api/ads/serve'));
    expect(res._data.ad.id).toBe('ad1');
  });

  it('excludes a non-statewide advertiser outside the viewer radius', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
      { id: 'a1', state: 'CA', tier: 'starter', radius_miles: 15, trial_ends_at: FUTURE },
    ] }) }) });
    const res: any = await adsServeGet(makeGetRequest('https://x.com/api/ads/serve?state=NY'));
    expect(res._data).toEqual({ ad: null });
  });

  it('excludes an advertiser whose state has no known centroid', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
      { id: 'a1', state: 'ZZ', tier: 'metro', radius_miles: 9999, trial_ends_at: FUTURE },
    ] }) }) });
    const res: any = await adsServeGet(makeGetRequest('https://x.com/api/ads/serve?state=MO'));
    expect(res._data).toEqual({ ad: null });
  });

  it('returns ad:null when no eligible advertiser has an active ad', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'a1', state: 'MO', tier: 'statewide', radius_miles: 9999, trial_ends_at: FUTURE }] }) }) };
      if (table === 'ads') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }) }) }) };
      return {};
    });
    const res: any = await adsServeGet(makeGetRequest('https://x.com/api/ads/serve?state=MO'));
    expect(res._data).toEqual({ ad: null });
  });
});

// ── POST /api/ads/track ──────────────────────────────────────────────────────

describe('POST /api/ads/track', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await adsTrackPost(makeRequest({ adId: 'ad1' }));
    expect(res._status).toBe(429);
  });

  it('returns 400 when adId is missing', async () => {
    const res: any = await adsTrackPost(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('logs a click event and increments the counter, defaulting type/path/state', async () => {
    const insert = vi.fn().mockResolvedValue({});
    mockFrom.mockReturnValue({ insert });
    const res: any = await adsTrackPost(makeRequest({ adId: 'ad1' }));
    expect(res._status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ ad_id: 'ad1', event_type: 'click', page_path: '', geo_state: '' }));
    expect(mockRpc).toHaveBeenCalledWith('inc_ad_clicks', { ad_id: 'ad1' });
  });

  it('logs a custom event type/path/state when provided', async () => {
    const insert = vi.fn().mockResolvedValue({});
    mockFrom.mockReturnValue({ insert });
    const res: any = await adsTrackPost(makeRequest({ adId: 'ad1', type: 'impression', path: '/listings', state: 'MO' }));
    expect(res._status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'impression', page_path: '/listings', geo_state: 'MO' }));
  });
});

// ── /api/advertiser/ads ───────────────────────────────────────────────────────

describe('GET /api/advertiser/ads', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await advertiserAdsGet();
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller is not an advertiser', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) });
    const res: any = await advertiserAdsGet();
    expect(res._status).toBe(403);
  });

  it('returns the advertiser and their ads', async () => {
    let advertiserCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1', trial_ends_at: FUTURE } }) }) }) };
      if (table === 'ads') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: 'ad1' }] }) }) }) };
      return {};
    });
    const res: any = await advertiserAdsGet();
    expect(res._status).toBe(200);
    expect(res._data.ads).toHaveLength(1);
  });
});

describe('POST /api/advertiser/ads', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await advertiserAdsPost(makeRequest({}));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller is not an advertiser', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) });
    const res: any = await advertiserAdsPost(makeRequest({}));
    expect(res._status).toBe(403);
  });

  it('returns 403 TRIAL_EXPIRED when the trial has ended', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1', trial_ends_at: PAST } }) }) }) });
    const res: any = await advertiserAdsPost(makeRequest({ headline: 'X' }));
    expect(res._status).toBe(403);
    expect(res._data.error).toBe('TRIAL_EXPIRED');
  });

  it('returns 400 for a non-http(s) cta_url', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1', trial_ends_at: FUTURE } }) }) }) });
    const res: any = await advertiserAdsPost(makeRequest({ ctaUrl: 'javascript:alert(1)' }));
    expect(res._status).toBe(400);
  });

  it('updates an existing ad when id is provided', async () => {
    let advertisersCall = 0;
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1', trial_ends_at: FUTURE } }) }) }) };
      if (table === 'ads') return { update };
      return {};
    });
    const res: any = await advertiserAdsPost(makeRequest({ id: 'ad1', headline: 'New Headline', ctaUrl: 'https://example.com' }));
    expect(res._status).toBe(200);
    expect(res._data.ok).toBe(true);
  });

  it('returns 500 when the update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1', trial_ends_at: FUTURE } }) }) }) };
      if (table === 'ads') return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) }) };
      return {};
    });
    const res: any = await advertiserAdsPost(makeRequest({ id: 'ad1' }));
    expect(res._status).toBe(500);
  });

  it('creates a new ad when no id is provided, using defaults', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1', trial_ends_at: FUTURE } }) }) }) };
      if (table === 'ads') return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'new-ad-1' }, error: null }) }) }) };
      return {};
    });
    const res: any = await advertiserAdsPost(makeRequest({ headline: 'Great Deals' }));
    expect(res._status).toBe(200);
    expect(res._data.ad.id).toBe('new-ad-1');
  });

  it('returns 500 when the create fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1', trial_ends_at: null } }) }) }) };
      if (table === 'ads') return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) };
      return {};
    });
    const res: any = await advertiserAdsPost(makeRequest({}));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/advertiser/ads', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await advertiserAdsDelete(makeGetRequest('https://x.com/api/advertiser/ads?id=ad1'));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller is not an advertiser', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) });
    const res: any = await advertiserAdsDelete(makeGetRequest('https://x.com/api/advertiser/ads?id=ad1'));
    expect(res._status).toBe(403);
  });

  it('returns 400 when id is missing', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' } }) }) }) });
    const res: any = await advertiserAdsDelete(makeGetRequest('https://x.com/api/advertiser/ads'));
    expect(res._status).toBe(400);
  });

  it('deletes the ad on success', async () => {
    const del = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' } }) }) }) };
      if (table === 'ads') return { delete: del };
      return {};
    });
    const res: any = await advertiserAdsDelete(makeGetRequest('https://x.com/api/advertiser/ads?id=ad1'));
    expect(res._status).toBe(200);
    expect(res._data.ok).toBe(true);
  });
});
