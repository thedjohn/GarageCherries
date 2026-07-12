import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockGetUserById, mockListUsers, mockSend, mockGetSiteSettings } = vi.hoisted(() => ({
  mockFrom:        vi.fn(),
  mockGetUserById: vi.fn(),
  mockListUsers:   vi.fn(),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockGetSiteSettings: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById, listUsers: mockListUsers } },
  })),
}));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/emailBranding', () => ({ emailWrap: (body: string) => `<wrap>${body}</wrap>` }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn(async () => {}) }),
}));
vi.mock('@/lib/siteSettings', () => ({ getSiteSettings: mockGetSiteSettings }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST as dealerReportPost } from '@/app/api/email/dealer-report/route';
import { POST as digestPost } from '@/app/api/email/digest/route';
import { POST as expiringListingsPost } from '@/app/api/email/expiring-listings/route';
import { POST as priceDropsPost } from '@/app/api/email/price-drops/route';
import { POST as promoExpiryPost } from '@/app/api/email/promo-expiry/route';

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

const AUTH = 'Bearer admin-secret';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_API_SECRET = 'admin-secret';
  mockGetSiteSettings.mockResolvedValue({
    promoApplicationCutoff: '2026-08-01T00:00:00Z',
    promoExpiresAt: '2026-10-31T23:59:59Z',
    advertiserTrialDays: 14,
    dealerDefaultTrialDays: 180,
  });
});

// ── POST /api/email/dealer-report ────────────────────────────────────────────

describe('POST /api/email/dealer-report', () => {
  it('returns 401 without the correct secret', async () => {
    const res: any = await dealerReportPost(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('reports zero when there are no opted-in dealers', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      return {};
    });
    const res: any = await dealerReportPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('sends a report per dealer with active/sold listings and inquiry counts', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'd1', name: 'Dealer One', email: 'd1@x.com' }] }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
        { id: 'l1', title: 'Car A', price: 10000, views: 50, is_sold: false },
        { id: 'l2', title: 'Car B', price: 20000, views: 10, is_sold: true },
      ] }) }) };
      if (table === 'inquiries') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: 3 }) }) }) };
      return {};
    });
    const res: any = await dealerReportPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ ok: true, sent: 1, total: 1 });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('skips a dealer with no email, and continues past a send failure', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
        { id: 'd1', name: 'No Email', email: null },
        { id: 'd2', name: 'Fails', email: 'd2@x.com' },
      ] }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      if (table === 'inquiries') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: 0 }) }) }) };
      return {};
    });
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    const res: any = await dealerReportPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
    expect(res._data.total).toBe(2);
  });
});

// ── POST /api/email/digest ───────────────────────────────────────────────────

describe('POST /api/email/digest', () => {
  it('returns 401 without the correct secret', async () => {
    const res: any = await digestPost(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('reports zero when there are no new listings', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) }) };
      return {};
    });
    const res: any = await digestPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('reports zero subscribers when watchers all opted out or have no email', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ id: 'c1', title: 'Car', make: 'Dodge', model: 'Charger', slug: 'x' }] }) }) }) }) }) };
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ not: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }] }) }) };
      return {};
    });
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u1', email: 'u1@x.com', user_metadata: { digest_opt_out: true } }] } });
    const res: any = await digestPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.message).toBe('No subscribers found');
  });

  it('emails eligible subscribers, continuing past a send failure', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ id: 'c1', title: 'Car', make: 'Dodge', model: 'Charger', slug: 'x', price: 1000, condition: 'Good', location: 'STL', state: 'MO' }] }) }) }) }) }) };
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ not: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }, { user_id: 'u2' }] }) }) };
      return {};
    });
    mockListUsers.mockResolvedValue({ data: { users: [
      { id: 'u1', email: 'u1@x.com', user_metadata: {} },
      { id: 'u2', email: 'u2@x.com', user_metadata: {} },
    ] } });
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    const res: any = await digestPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(1);
    expect(res._data.total).toBe(2);
  });
});

// ── POST /api/email/expiring-listings ───────────────────────────────────────

describe('POST /api/email/expiring-listings', () => {
  it('returns 401 without the correct secret', async () => {
    const res: any = await expiringListingsPost(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('reports zero when nothing is expiring soon', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ lte: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [] }) }) }) }) }) }) }) };
      }
      return {};
    });
    const res: any = await expiringListingsPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  function setupExpiring(listings: any[]) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ lte: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: listings }) }) }) }) }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      return {};
    });
  }

  it('resolves the seller email via auth account when available', async () => {
    setupExpiring([{ id: 'l1', title: 'Nice Car', slug: 'x', make: 'Dodge', model: 'Charger', seller_id: 's1', seller_email: 'fallback@x.com', expires_at: new Date(Date.now() + 2 * 86400000).toISOString() }]);
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'auth@x.com' } } });
    const res: any = await expiringListingsPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(1);
    expect(mockSend.mock.calls[0][0].to).toBe('auth@x.com');
  });

  it('falls back to listing seller_email when the auth account has none', async () => {
    setupExpiring([{ id: 'l1', title: 'Nice Car', slug: 'x', make: 'Dodge', model: 'Charger', seller_id: 's1', seller_email: 'fallback@x.com', expires_at: new Date(Date.now() + 2 * 86400000).toISOString() }]);
    mockGetUserById.mockResolvedValue({ data: { user: null } });
    const res: any = await expiringListingsPost(makeRequest(AUTH));
    expect(mockSend.mock.calls[0][0].to).toBe('fallback@x.com');
  });

  it('skips a listing with no resolvable seller email at all', async () => {
    setupExpiring([{ id: 'l1', title: 'Nice Car', slug: 'x', make: 'Dodge', model: 'Charger', seller_id: null, seller_email: null, expires_at: new Date(Date.now() + 2 * 86400000).toISOString() }]);
    const res: any = await expiringListingsPost(makeRequest(AUTH));
    expect(res._data.sent).toBe(0);
  });

  it('continues past a send failure', async () => {
    setupExpiring([{ id: 'l1', title: 'Nice Car', slug: 'x', make: 'Dodge', model: 'Charger', seller_id: null, seller_email: 's@x.com', expires_at: new Date(Date.now() + 2 * 86400000).toISOString() }]);
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    const res: any = await expiringListingsPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
    expect(res._data.total).toBe(1);
  });
});

// ── POST /api/email/price-drops ─────────────────────────────────────────────

describe('POST /api/email/price-drops', () => {
  it('returns 401 without the correct secret', async () => {
    const res: any = await priceDropsPost(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('reports zero when there are no price changes this week', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'price_history') return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      return {};
    });
    const res: any = await priceDropsPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
  });

  it('reports zero when no one is watching the changed cars', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'price_history') return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ car_id: 'c1', price: 9000, changed_at: '2026-01-01' }] }) }) }) };
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ not: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      return {};
    });
    const res: any = await priceDropsPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.message).toBe('No watchers for changed cars');
  });

  it('groups by user and emails a digest per watcher, skipping unresolvable users/cars', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'price_history') return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ car_id: 'c1', price: 9000, changed_at: '2026-01-01' }] }) }) }) };
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ not: vi.fn().mockResolvedValue({ data: [
        { user_id: 'u1', car_id: 'c1' },
        { user_id: 'u2', car_id: 'c1' }, // u2 has no resolvable email
        { user_id: 'u1', car_id: 'c-deleted' }, // filtered out (not in carMap)
      ] }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [{ id: 'c1', title: 'Nice Car', price: 9000, make: 'Dodge', model: 'Charger', slug: 'x' }] }) }) };
      return {};
    });
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u1', email: 'u1@x.com' }] } });
    const res: any = await priceDropsPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(1);
    expect(mockSend.mock.calls[0][0].to).toBe('u1@x.com');
  });

  it('continues past a send failure (logged via console.error)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'price_history') return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ car_id: 'c1', price: 9000, changed_at: '2026-01-01' }] }) }) }) };
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ not: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1', car_id: 'c1' }] }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [{ id: 'c1', title: 'Nice Car', price: 9000, make: 'Dodge', model: 'Charger', slug: 'x' }] }) }) };
      return {};
    });
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u1', email: 'u1@x.com' }] } });
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res: any = await priceDropsPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
    consoleSpy.mockRestore();
  });
});

// ── POST /api/email/promo-expiry ────────────────────────────────────────────

describe('POST /api/email/promo-expiry', () => {
  it('returns 401 without the correct secret', async () => {
    const res: any = await promoExpiryPost(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('notifies eligible profiles, dealers, and advertisers, skipping unresolvable emails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [{ id: 'p1', full_name: 'Seller One' }, { id: 'p2', full_name: 'No Email' }] }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'dealers') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [{ id: 'd1', name: 'Dealer Co', email: 'dealer@x.com' }, { id: 'd2', name: 'No Email Dealer', email: null }] }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ lte: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [{ id: 'a1', business_name: 'Ads Co', email: 'ads@x.com' }] }) }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      return {};
    });
    mockGetUserById.mockImplementation((id: string) => {
      if (id === 'p1') return Promise.resolve({ data: { user: { email: 'seller1@x.com' } } });
      return Promise.resolve({ data: { user: null } });
    });

    const res: any = await promoExpiryPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(3); // p1 + d1 + a1
    expect(res._data.skipped).toBe(2); // p2 + d2
    expect(res._data.errors).toBeUndefined();
  });

  it('collects errors when a send fails, keyed by entity type', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [{ id: 'p1', full_name: 'Seller One' }] }) }) }),
        };
      }
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ lte: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
      return {};
    });
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'seller1@x.com' } } });
    mockSend.mockRejectedValueOnce(new Error('resend down'));

    const res: any = await promoExpiryPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
    expect(res._data.errors).toHaveLength(1);
    expect(res._data.errors[0]).toContain('profile p1');
  });

  it('uses a custom promo_expires_at from site settings for the dealer match date and email copy', async () => {
    mockGetSiteSettings.mockResolvedValue({
      promoApplicationCutoff: '2026-08-01T00:00:00Z',
      promoExpiresAt: '2026-12-25T23:59:59Z',
      advertiserTrialDays: 14,
      dealerDefaultTrialDays: 180,
    });
    let dealerEqArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      if (table === 'dealers') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn((_col: string, val: string) => { dealerEqArg = val; return { is: vi.fn().mockResolvedValue({ data: [{ id: 'd1', name: 'Dealer Co', email: 'dealer@x.com' }] }) }; }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ lte: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
      return {};
    });
    const res: any = await promoExpiryPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(dealerEqArg).toBe('2026-12-25');
    expect(mockSend.mock.calls[0][0].subject).toContain('December 25, 2026');
  });

  it('collects dealer- and advertiser-send errors too', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [{ id: 'd1', name: 'Dealer Co', email: 'dealer@x.com' }] }) }) }) };
      if (table === 'advertisers') return { select: vi.fn().mockReturnValue({ lte: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [{ id: 'a1', business_name: 'Ads Co', email: 'ads@x.com' }] }) }) }) }) };
      return {};
    });
    mockSend.mockRejectedValue(new Error('resend down'));

    const res: any = await promoExpiryPost(makeRequest(AUTH));
    expect(res._status).toBe(200);
    expect(res._data.sent).toBe(0);
    expect(res._data.errors).toEqual([
      expect.stringContaining('dealer d1'),
      expect.stringContaining('advertiser a1'),
    ]);
  });
});
