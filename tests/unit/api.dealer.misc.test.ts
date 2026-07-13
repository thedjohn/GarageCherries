import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockGetUserById, mockSend } = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockGetUserById: vi.fn(),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('next/server', () => {
  class MockNextResponse {
    body: any; init: any;
    constructor(body: any, init?: any) { this.body = body; this.init = init; }
  }
  return {
    NextResponse: Object.assign(MockNextResponse, {
      json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
    }),
  };
});

import { GET as exportGet } from '@/app/api/dealer/export/route';
import { POST as messageWatchers } from '@/app/api/dealer/message-watchers/route';
import { GET as metricsGet } from '@/app/api/dealer/metrics/route';
import { POST as settingsPost } from '@/app/api/dealer/settings/route';
import { GET as watcherCountsGet } from '@/app/api/dealer/watcher-counts/route';

function makeGetRequest(url: string) {
  return { url, headers: new Headers() } as unknown as NextRequest;
}
function makePostRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return { json: async () => body, headers: new Headers(headers) } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1', email: 'dealer@x.com' } } });
});

// ── GET /api/dealer/export ──────────────────────────────────────────────────

describe('GET /api/dealer/export', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await exportGet(makeGetRequest('https://x.com/api/dealer/export'));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller is not a dealer', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await exportGet(makeGetRequest('https://x.com/api/dealer/export'));
    expect(res._status).toBe(403);
  });

  it('returns 500 on a listings query error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', name: 'Classic Cars Co' } }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) };
      return {};
    });
    const res: any = await exportGet(makeGetRequest('https://x.com/api/dealer/export'));
    expect(res._status).toBe(500);
  });

  function setupDealerListings() {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', name: 'Classic Cars Co!' } }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: 'l1', title: 'Nice, "classic" car\ntitle' }], error: null }) }) }) };
      return {};
    });
  }

  it('exports JSON by default', async () => {
    setupDealerListings();
    const res: any = await exportGet(makeGetRequest('https://x.com/api/dealer/export'));
    expect(res.init.headers['Content-Type']).toBe('application/json');
    const parsed = JSON.parse(res.body);
    expect(parsed.dealer).toBe('Classic Cars Co!');
    expect(parsed.count).toBe(1);
  });

  it('exports CSV, escaping commas/quotes/newlines', async () => {
    setupDealerListings();
    const res: any = await exportGet(makeGetRequest('https://x.com/api/dealer/export?format=csv'));
    expect(res.init.headers['Content-Type']).toBe('text/csv');
    expect(res.body).toContain('"Nice, ""classic"" car\ntitle"');
  });

  it('handles zero listings', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', name: 'Empty Co' } }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) };
      return {};
    });
    const res: any = await exportGet(makeGetRequest('https://x.com/api/dealer/export'));
    const parsed = JSON.parse(res.body);
    expect(parsed.count).toBe(0);
  });
});

// ── POST /api/dealer/message-watchers ───────────────────────────────────────

describe('POST /api/dealer/message-watchers', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: 'hi' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when carId or message is missing', async () => {
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: '  ' }));
    expect(res._status).toBe(400);
  });

  it('returns 403 when the dealer is not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: 'hi' }));
    expect(res._status).toBe(403);
  });

  it('returns 403 when the car is not owned by this dealer', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', name: 'Dealer' } }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }) };
      return {};
    });
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: 'hi' }));
    expect(res._status).toBe(403);
  });

  function setupOwnedCar(watchers: any[] | null) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', name: 'Dealer' } }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', title: 'Nice Car', slug: 'nice-car', make: 'Dodge', model: 'Charger' } }) }) }) }) };
      if (table === 'watchlists') return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: watchers }) }) }) }) }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
      };
      return {};
    });
  }

  it('returns sent:0 when there are no eligible watchers', async () => {
    setupOwnedCar([]);
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: 'hi' }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('emails eligible watchers and marks them messaged', async () => {
    setupOwnedCar([{ id: 'watch-1', user_id: 'buyer-1' }, { id: 'watch-2', user_id: 'buyer-2' }]);
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'buyer@x.com' } } });
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: 'Price just dropped!' }, { origin: 'https://garagecherries.com' }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('skips a watcher with no resolvable email', async () => {
    setupOwnedCar([{ id: 'watch-1', user_id: 'buyer-1' }]);
    mockGetUserById.mockResolvedValue({ data: { user: null } });
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: 'hi' }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('skips a watcher whose email send throws, continuing with others', async () => {
    setupOwnedCar([{ id: 'watch-1', user_id: 'buyer-1' }, { id: 'watch-2', user_id: 'buyer-2' }]);
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'buyer@x.com' } } });
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    const res: any = await messageWatchers(makePostRequest({ carId: 'c1', message: 'hi' }));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(1);
  });
});

// ── GET /api/dealer/metrics ──────────────────────────────────────────────────

describe('GET /api/dealer/metrics', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await metricsGet(makeGetRequest('https://x.com/api/dealer/metrics'));
    expect(res._status).toBe(401);
  });

  it('returns 404 when the dealer is not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await metricsGet(makeGetRequest('https://x.com/api/dealer/metrics'));
    expect(res._status).toBe(404);
  });

  it('computes views/inquiries deltas, avg days on market, and enriches recent inquiries', async () => {
    let listingViewsCall = 0;
    let inquiriesCall = 0;
    let listingsCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dealer-1' } }) }) }) };
      if (table === 'listing_views') {
        listingViewsCall++;
        // Call 1 (views30d): .select().eq().gte() is awaited directly, no .lt().
        // Call 2 (viewsPrev30d): .select().eq().gte().lt() is awaited.
        if (listingViewsCall === 1) {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ count: 20 }) }) }) };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ lt: vi.fn().mockResolvedValue({ count: 10 }) }) }) }) };
      }
      if (table === 'inquiries') {
        inquiriesCall++;
        if (inquiriesCall === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ count: 5 }) }) }) };
        if (inquiriesCall === 2) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ lt: vi.fn().mockResolvedValue({ count: 2 }) }) }) }) };
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ id: 'inq-1', listing_id: 'l1', created_at: '2026-01-01' }, { id: 'inq-2', listing_id: 'l2', created_at: '2026-01-02' }] }) }) }) }) };
      }
      if (table === 'listings') {
        listingsCall++;
        if (listingsCall === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ listed_at: new Date(Date.now() - 5 * 86400000).toISOString() }, { listed_at: 'invalid-date' }] }) }) }) }) };
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [{ id: 'l1', title: 'Nice Car' }] }) }) };
      }
      return {};
    });

    const res: any = await metricsGet(makeGetRequest('https://x.com/api/dealer/metrics'));
    expect(res._status).toBe(200);
    expect(res._data.views30d).toBe(20);
    expect(res._data.viewsDelta).toBe(100); // (20-10)/10*100
    expect(res._data.inquiries30d).toBe(5);
    expect(res._data.recentInquiries).toHaveLength(2);
    expect(res._data.recentInquiries[0].carTitle).toBe('Nice Car');
    expect(res._data.recentInquiries[1].carTitle).toBe('Unknown listing');
  });

  it('returns null deltas and zero avgDaysOnMarket when there is no prior-period or listing data', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dealer-1' } }) }) }) };
      if (table === 'listing_views') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ lt: vi.fn().mockResolvedValue({ count: 0 }) }) }) }) };
      if (table === 'inquiries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({ lt: vi.fn().mockResolvedValue({ count: 0 }), }),
              order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }),
            }),
          }),
        };
      }
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
      return {};
    });
    const res: any = await metricsGet(makeGetRequest('https://x.com/api/dealer/metrics'));
    expect(res._status).toBe(200);
    expect(res._data.viewsDelta).toBeNull();
    expect(res._data.inquiriesDelta).toBeNull();
    expect(res._data.avgDaysOnMarket).toBe(0);
  });
});

// ── POST /api/dealer/settings ────────────────────────────────────────────────

describe('POST /api/dealer/settings', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await settingsPost(makePostRequest({ name: 'X' }));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the dealer is not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await settingsPost(makePostRequest({ name: 'X' }));
    expect(res._status).toBe(403);
  });

  it('returns 403 when dealerId in the body does not match the owned dealer', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', plan: 'beta', beta_expires_at: null } }) }) }) };
      return {};
    });
    const res: any = await settingsPost(makePostRequest({ dealerId: 'other-dealer', name: 'X' }));
    expect(res._status).toBe(403);
  });

  it('returns 500 when the update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', plan: 'beta', beta_expires_at: null } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
        };
      }
      return {};
    });
    const res: any = await settingsPost(makePostRequest({ name: 'X' }));
    expect(res._status).toBe(500);
  });

  it('updates settings and returns plan info', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dealer-1', plan: 'beta', beta_expires_at: '2026-12-31T00:00:00Z' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {};
    });
    const res: any = await settingsPost(makePostRequest({ dealerId: 'dealer-1', name: 'New Name', phone: '314-555-0100' }));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ ok: true, plan: 'beta', beta_expires_at: '2026-12-31T00:00:00Z' });
  });
});

// ── GET /api/dealer/watcher-counts ──────────────────────────────────────────

describe('GET /api/dealer/watcher-counts', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await watcherCountsGet(makeGetRequest('https://x.com/api/dealer/watcher-counts?carIds=c1'));
    expect(res._status).toBe(401);
  });

  it('returns empty counts when carIds is missing', async () => {
    const res: any = await watcherCountsGet(makeGetRequest('https://x.com/api/dealer/watcher-counts'));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ counts: {}, messaged: {}, views: {}, totalWatchers: {} });
  });

  it('returns empty counts when none of the requested carIds are owned by the caller', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      return {};
    });
    const res: any = await watcherCountsGet(makeGetRequest('https://x.com/api/dealer/watcher-counts?carIds=c1,c2'));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ counts: {}, messaged: {}, views: {}, totalWatchers: {} });
  });

  it('computes eligible-watcher counts, messaged flags, total watchers, and view counts, filtering to owned cars', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [{ id: 'c1' }] }) }) }) };
      if (table === 'watchlists') return {
        select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [
          { car_id: 'c1', dealer_messaged_at: null, allow_dealer_contact: true, dealer_contact_blocked: false },
          { car_id: 'c1', dealer_messaged_at: '2026-01-01', allow_dealer_contact: true, dealer_contact_blocked: false },
          { car_id: 'c1', dealer_messaged_at: null, allow_dealer_contact: false, dealer_contact_blocked: false },
        ] }) }),
      };
      if (table === 'listing_views') return {
        select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [
          { listing_id: 'c1' }, { listing_id: 'c1' }, { listing_id: 'c1' },
        ] }) }),
      };
      return {};
    });
    const res: any = await watcherCountsGet(makeGetRequest('https://x.com/api/dealer/watcher-counts?carIds=c1,c2-not-owned'));
    expect(res._status).toBe(200);
    expect(res._data.counts.c1).toBe(1);
    expect(res._data.messaged.c1).toBe(true);
    expect(res._data.totalWatchers.c1).toBe(3);
    expect(res._data.views.c1).toBe(3);
    expect(res._data.counts['c2-not-owned']).toBeUndefined();
  });
});
