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
    const range = vi.fn().mockResolvedValue({ data: [{ id: 'l1' }], error: null, count: 1 });
    const order = vi.fn().mockReturnValue({ range });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });

    const res: any = await GET(makeGetRequest({ page: '2', limit: '10' }));
    expect(res._status).toBe(200);
    expect(res._data.total).toBe(1);
    expect(res._data.page).toBe(2);
  });

  it('filters by seller_id when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const range = vi.fn().mockReturnValue({ eq });
    const order = vi.fn().mockReturnValue({ range });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });

    const res: any = await GET(makeGetRequest({ seller_id: 'seller-1' }));
    expect(eq).toHaveBeenCalledWith('seller_id', 'seller-1');
    expect(res._status).toBe(200);
  });

  it('returns 500 on a query error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    const range = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' }, count: null });
    const order = vi.fn().mockReturnValue({ range });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });

    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(500);
  });

  it('overlays the live dealer name/phone onto listings whose seller_id matches a dealer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        const range = vi.fn().mockResolvedValue({
          data: [
            { id: 'l1', seller_id: 'dealer-1', seller_name: 'STALE NAME', seller_phone: '111' },
            { id: 'l2', seller_id: 'private-seller-1', seller_name: 'Jane Private', seller_phone: '222' },
          ],
          error: null, count: 2,
        });
        const order = vi.fn().mockReturnValue({ range });
        return { select: vi.fn().mockReturnValue({ order }) };
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
