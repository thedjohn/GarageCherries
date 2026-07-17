import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockGetUser, mockRequireAdmin, mockFrom, mockStorageRemove,
  mockSend, mockPostToFacebook, mockLoggerInfo, mockLoggerWarn, mockLoggerError, mockLoggerFlush,
} = vi.hoisted(() => ({
  mockGetUser:        vi.fn(),
  mockRequireAdmin:   vi.fn(),
  mockFrom:           vi.fn(),
  mockStorageRemove:  vi.fn(),
  mockSend:           vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockPostToFacebook: vi.fn().mockResolvedValue(undefined),
  mockLoggerInfo:     vi.fn(),
  mockLoggerWarn:     vi.fn(),
  mockLoggerError:    vi.fn(),
  mockLoggerFlush:    vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: vi.fn(() => ({ remove: mockStorageRemove })) },
  })),
}));

vi.mock('@/lib/admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/admin')>('@/lib/admin');
  return { ...actual, requireAdmin: mockRequireAdmin };
});

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: mockLoggerWarn, error: mockLoggerError, flush: mockLoggerFlush }),
}));

vi.mock('@/lib/facebook/postToPage', () => ({
  postListingToFacebook: mockPostToFacebook,
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      _data: data,
      _status: init?.status ?? 200,
    })),
  },
}));

import { GET, PATCH, DELETE } from '@/app/api/admin/listings/route';

function makeGetRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params), origin: 'http://localhost:3000' } } as unknown as NextRequest;
}

function makeJsonRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    nextUrl: { origin: 'http://localhost:3000' },
  } as unknown as NextRequest;
}

// A chainable + thenable query-builder mock: every filter/order method returns
// `this`, and the object itself resolves like a promise (mirrors Supabase's
// real query builder, which is thenable at any point in the chain). Used for
// GET /api/admin/listings, whose query now chains multiple .order() calls and
// an arbitrary set of optional filters before terminating on .range().
function makeListingsBuilder(result: { data?: any; error?: any; count?: number | null }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    not: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

// Sets up mockFrom for a full GET /api/admin/listings call: the first
// 'listings' call is the main paginated query, the next 3 are the always-on
// pending/approved/rejected status-count queries (in that order).
function setupListingsGet(mainResult: { data?: any; error?: any; count?: number | null }, statusCounts = { pending: 0, approved: 0, rejected: 0 }) {
  let listingsCalls = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') {
      listingsCalls++;
      if (listingsCalls === 1) return makeListingsBuilder(mainResult);
      const countByCall = [statusCounts.pending, statusCounts.approved, statusCounts.rejected];
      return makeListingsBuilder({ count: countByCall[listingsCalls - 2] ?? 0 });
    }
    if (table === 'dealers') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [] }) }) };
    return {};
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
});

// ── GET /api/admin/listings ─────────────────────────────────────────────────

describe('GET /api/admin/listings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });

  it('returns 403 for support role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('support');
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(403);
  });

  it('returns paginated listings for moderator+', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    setupListingsGet({ data: [{ id: 'l1' }], error: null, count: 1 });

    const res: any = await GET(makeGetRequest({ page: '2', limit: '10' }));
    expect(res._status).toBe(200);
    expect(res._data.total).toBe(1);
    expect(res._data.page).toBe(2);
    expect(res._data.statusCounts).toEqual({ pending: 0, approved: 0, rejected: 0 });
  });

  it('filters by seller_id when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('admin');
    let capturedEq: [string, string] | null = null;
    let listingsCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        const builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        const originalEq = builder.eq;
        builder.eq = vi.fn((...args: [string, string]) => { capturedEq = args; return originalEq(...args); });
        return builder;
      }
      return {};
    });

    const res: any = await GET(makeGetRequest({ seller_id: 'seller-1' }));
    expect(capturedEq).toEqual(['seller_id', 'seller-1']);
    expect(res._status).toBe(200);
  });

  it('sorts by year descending, then make, then model ascending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let capturedOrders: any[] = [];
    let listingsCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        const builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        const originalOrder = builder.order;
        builder.order = vi.fn((...args: any[]) => { capturedOrders.push(args); return originalOrder(...args); });
        return builder;
      }
      return {};
    });

    await GET(makeGetRequest());
    expect(capturedOrders).toEqual([
      ['year', { ascending: false }],
      ['make', { ascending: true }],
      ['model', { ascending: true }],
    ]);
  });

  it('applies make/model/year/price/status/resubmission/featured filters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let listingsCalls = 0;
    let builder: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        return builder;
      }
      return {};
    });

    await GET(makeGetRequest({
      make: 'Dodge', model: 'Challenger', yearMin: '1970', yearMax: '1974',
      priceMin: '10000', priceMax: '50000', status: 'approved',
      resubmissionsOnly: 'true', featuredOnly: 'true',
    }));
    expect(builder.eq).toHaveBeenCalledWith('make', 'Dodge');
    expect(builder.ilike).toHaveBeenCalledWith('model', '%Challenger%');
    expect(builder.gte).toHaveBeenCalledWith('year', 1970);
    expect(builder.lte).toHaveBeenCalledWith('year', 1974);
    expect(builder.gte).toHaveBeenCalledWith('price', 10000);
    expect(builder.lte).toHaveBeenCalledWith('price', 50000);
    expect(builder.eq).toHaveBeenCalledWith('status', 'approved');
    expect(builder.gt).toHaveBeenCalledWith('resubmission_count', 0);
    expect(builder.eq).toHaveBeenCalledWith('featured', true);
  });

  it('ignores a status of "all" (no filter applied)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let listingsCalls = 0;
    let builder: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        return builder;
      }
      return {};
    });

    await GET(makeGetRequest({ status: 'all' }));
    expect(builder.eq).not.toHaveBeenCalledWith('status', expect.anything());
  });

  it('applies the Facebook-posted filter both ways', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let listingsCalls = 0;
    let builder: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        return builder;
      }
      return {};
    });

    await GET(makeGetRequest({ fbPosted: 'posted' }));
    expect(builder.not).toHaveBeenCalledWith('fb_posted_at', 'is', null);

    listingsCalls = 0;
    await GET(makeGetRequest({ fbPosted: 'not_posted' }));
    expect(builder.is).toHaveBeenCalledWith('fb_posted_at', null);
  });

  it('applies the expiringSoon filter as a 7-day window from now', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let listingsCalls = 0;
    let builder: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        return builder;
      }
      return {};
    });

    await GET(makeGetRequest({ expiringSoon: 'true' }));
    expect(builder.gte).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(builder.lte).toHaveBeenCalledWith('expires_at', expect.any(String));
  });

  it('filters to dealer-only listings via an in() clause built from all dealer ids', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let listingsCalls = 0;
    let builder: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        return builder;
      }
      if (table === 'dealers') {
        return { select: vi.fn().mockReturnValue(Promise.resolve({ data: [{ id: 'dealer-1' }, { id: 'dealer-2' }] })) };
      }
      return {};
    });

    await GET(makeGetRequest({ sellerType: 'dealer' }));
    expect(builder.in).toHaveBeenCalledWith('seller_id', ['dealer-1', 'dealer-2']);
  });

  it('filters to private-seller listings via a not-in clause, and no-ops when there are zero dealers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let listingsCalls = 0;
    let builder: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls > 1) return makeListingsBuilder({ count: 0 });
        builder = makeListingsBuilder({ data: [], error: null, count: 0 });
        return builder;
      }
      if (table === 'dealers') {
        return { select: vi.fn().mockReturnValue(Promise.resolve({ data: [] })) };
      }
      return {};
    });

    await GET(makeGetRequest({ sellerType: 'private' }));
    // Zero dealers exist, so the not-in clause would be meaningless — skipped entirely.
    expect(builder.not).not.toHaveBeenCalled();
  });

  it('computes statusCounts from three independent unfiltered counts', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    // Apply an unrelated filter (make=Dodge) to prove statusCounts stays
    // unaffected by whatever filters are applied to the main query.
    setupListingsGet({ data: [], error: null, count: 0 }, { pending: 3, approved: 8, rejected: 1 });

    const res: any = await GET(makeGetRequest({ make: 'Dodge' }));
    expect(res._data.statusCounts).toEqual({ pending: 3, approved: 8, rejected: 1 });
  });

  it('returns 500 on a query error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    setupListingsGet({ data: null, error: { message: 'db down' }, count: null });

    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(500);
  });

  it('overlays the live dealer name/phone onto listings whose seller_id matches a dealer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    let listingsCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        listingsCalls++;
        if (listingsCalls === 1) {
          return makeListingsBuilder({
            data: [
              { id: 'l1', seller_id: 'dealer-1', seller_name: 'STALE NAME', seller_phone: '111' },
              { id: 'l2', seller_id: 'private-seller-1', seller_name: 'Jane Private', seller_phone: '222' },
            ],
            error: null, count: 2,
          });
        }
        return makeListingsBuilder({ count: 0 });
      }
      if (table === 'dealers') {
        const inFn = vi.fn().mockResolvedValue({ data: [{ id: 'dealer-1', name: 'AutoArcheologist', phone: '860-398-1732' }] });
        return { select: vi.fn().mockReturnValue({ in: inFn }) };
      }
      return {};
    });

    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(200);
    const l1 = res._data.listings.find((l: any) => l.id === 'l1');
    const l2 = res._data.listings.find((l: any) => l.id === 'l2');
    expect(l1.seller_name).toBe('AutoArcheologist');
    expect(l1.seller_phone).toBe('860-398-1732');
    // Private-seller listing has no matching dealer row — stays untouched
    expect(l2.seller_name).toBe('Jane Private');
    expect(l2.seller_phone).toBe('222');
  });
});

// ── PATCH /api/admin/listings — edit (no action) ────────────────────────────

describe('PATCH /api/admin/listings — edit', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await PATCH(makeJsonRequest({ id: 'l1', year: 1969 }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await PATCH(makeJsonRequest({}));
    expect(res._status).toBe(400);
  });

  it('returns 401 when role is below admin (moderator)', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await PATCH(makeJsonRequest({ id: 'l1', year: 1969, make: 'Dodge', model: 'Charger' }));
    expect(res._status).toBe(401);
  });

  it('updates the listing and returns success', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) });

    const res: any = await PATCH(makeJsonRequest({
      id: 'l1', year: 1969, make: 'Dodge', model: 'Charger', price: 50000,
      mileage: 12000, condition: 'Excellent', body_style: 'Coupe', transmission: 'Manual',
      engine: '440', color: 'Red', location: 'STL', state: 'MO', description: 'Nice car',
      seller_name: 'Seller', seller_phone: '314', seller_email: 's@x.com', featured: true, status: 'approved',
    }));
    expect(res._data.success).toBe(true);
  });

  it('handles blank mileage/engine/color and returns 500 on update failure', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) });

    const res: any = await PATCH(makeJsonRequest({
      id: 'l1', year: 1969, make: 'Dodge', model: 'Charger', price: 50000,
      mileage: '', engine: '', color: '',
    }));
    expect(res._status).toBe(500);
  });
});

// ── PATCH /api/admin/listings — approve/reject ──────────────────────────────

describe('PATCH /api/admin/listings — approve/reject', () => {
  it('returns 401 when role is below moderator (support)', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'approve' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 for an invalid action', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'bogus' }));
    expect(res._status).toBe(400);
  });

  function setupListingFetch(listing: Record<string, unknown> | null) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: listing }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {};
    });
  }

  it('approves a listing, posts to Facebook, emails the seller, and triggers alert match', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    setupListingFetch({
      id: 'l1', title: '1969 Dodge Charger', make: 'Dodge', model: 'Charger', year: 1969,
      price: 50000, images: ['a.jpg'], slug: '1969-dodge-charger', seller_email: 's@x.com', seller_name: 'Seller', seller_id: 'seller-1',
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'approve' }));
    expect(res._data.success).toBe(true);
    expect(mockPostToFacebook).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledOnce();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/alerts/match'),
      expect.objectContaining({ method: 'POST' }),
    );
    await new Promise(process.nextTick);
    expect(mockLoggerInfo).toHaveBeenCalledWith('Approval email sent', expect.anything());
  });

  it('rejects a listing with a reason and emails the seller', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    setupListingFetch({
      id: 'l1', title: '1969 Dodge Charger', make: 'Dodge', model: 'Charger', year: 1969,
      price: 50000, images: [], slug: '1969-dodge-charger', seller_email: 's@x.com', seller_name: 'Seller', seller_id: 'seller-1',
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'reject', rejection_reason: 'Bad photos' }));
    expect(res._data.success).toBe(true);
    expect(mockPostToFacebook).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledOnce();
    await new Promise(process.nextTick);
    expect(mockLoggerInfo).toHaveBeenCalledWith('Rejection email sent', expect.anything());
  });

  it('rejects without a seller name, defaulting to "there", and without a reason', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    setupListingFetch({
      id: 'l1', title: '1969 Dodge Charger', make: 'Dodge', model: 'Charger', year: 1969,
      price: 50000, images: [], slug: '1969-dodge-charger', seller_email: 's@x.com', seller_name: null, seller_id: 'seller-1',
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'reject' }));
    expect(res._data.success).toBe(true);
  });

  it('skips the seller email entirely when the listing has no seller_email', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    setupListingFetch({
      id: 'l1', title: '1969 Dodge Charger', make: 'Dodge', model: 'Charger', year: 1969,
      price: 50000, images: [], slug: '1969-dodge-charger', seller_email: null, seller_name: 'Seller', seller_id: 'seller-1',
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'approve' }));
    expect(res._data.success).toBe(true);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalled();
  });

  it('returns 500 when the status update fails', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
        };
      }
      return {};
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'approve' }));
    expect(res._status).toBe(500);
  });

  it('handles email send rejection without throwing (approve path)', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    setupListingFetch({
      id: 'l1', title: '1969 Dodge Charger', make: 'Dodge', model: 'Charger', year: 1969,
      price: 50000, images: [], slug: '1969-dodge-charger', seller_email: 's@x.com', seller_name: 'Seller', seller_id: 'seller-1',
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'approve' }));
    expect(res._data.success).toBe(true);
    await new Promise(process.nextTick);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('handles email send rejection without throwing (reject path)', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    setupListingFetch({
      id: 'l1', title: '1969 Dodge Charger', make: 'Dodge', model: 'Charger', year: 1969,
      price: 50000, images: [], slug: '1969-dodge-charger', seller_email: 's@x.com', seller_name: 'Seller', seller_id: 'seller-1',
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'reject', rejection_reason: 'Bad photos' }));
    expect(res._data.success).toBe(true);
    await new Promise(process.nextTick);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

// ── PATCH /api/admin/listings — repost_facebook ─────────────────────────────

describe('PATCH /api/admin/listings — repost_facebook', () => {
  it('returns 401 when role is below admin (moderator)', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'repost_facebook' }));
    expect(res._status).toBe(401);
    expect(mockPostToFacebook).not.toHaveBeenCalled();
  });

  it('returns 404 when the listing does not exist', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      }
      return {};
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'repost_facebook' }));
    expect(res._status).toBe(404);
    expect(mockPostToFacebook).not.toHaveBeenCalled();
  });

  it('posts to Facebook and records fb_posted_at on success', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockPostToFacebook.mockResolvedValueOnce(true);
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { id: 'l1', title: '1941 Cadillac', make: 'Cadillac', model: 'Series 62', year: 1941, price: 88000, images: ['a.jpg'], slug: '1941-cadillac' },
          }) }) }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        };
      }
      return {};
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'repost_facebook' }));
    expect(res._status).toBe(200);
    expect(res._data.success).toBe(true);
    expect(mockPostToFacebook).toHaveBeenCalledOnce();
    expect(updateEq).toHaveBeenCalledWith('id', 'l1');
    expect(mockLoggerInfo).toHaveBeenCalledWith('Listing manually reposted to Facebook', expect.anything());
  });

  it('does not record fb_posted_at when the Facebook post fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockPostToFacebook.mockResolvedValueOnce(false);
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { id: 'l1', title: '1941 Cadillac', make: 'Cadillac', model: 'Series 62', year: 1941, price: 88000, images: ['a.jpg'], slug: '1941-cadillac' },
          }) }) }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        };
      }
      return {};
    });

    const res: any = await PATCH(makeJsonRequest({ id: 'l1', action: 'repost_facebook' }));
    expect(res._status).toBe(200);
    expect(res._data.success).toBe(false);
    expect(updateEq).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalledWith('Manual Facebook repost failed', expect.anything());
  });
});

// ── DELETE /api/admin/listings ──────────────────────────────────────────────

describe('DELETE /api/admin/listings', () => {
  it('returns 401 when role is below superadmin', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await DELETE(makeJsonRequest({ id: 'l1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await DELETE(makeJsonRequest({}));
    expect(res._status).toBe(400);
  });

  it('removes storage images, deletes conversations, and deletes the listing', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { images: ['https://x.supabase.co/storage/v1/object/public/listing-images/cars/private/a.jpg'] } }) }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
    });

    const res: any = await DELETE(makeJsonRequest({ id: 'l1' }));
    expect(mockStorageRemove).toHaveBeenCalled();
    expect(res._data.success).toBe(true);
  });

  it('skips storage cleanup when the listing has no images', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { images: [] } }) }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
    });

    const res: any = await DELETE(makeJsonRequest({ id: 'l1' }));
    expect(mockStorageRemove).not.toHaveBeenCalled();
    expect(res._data.success).toBe(true);
  });

  it('returns 500 when the delete fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1', email: 'admin@x.com' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
    });

    const res: any = await DELETE(makeJsonRequest({ id: 'l1' }));
    expect(res._status).toBe(500);
  });
});
