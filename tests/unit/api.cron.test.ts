import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetSiteSettings } = vi.hoisted(() => ({ mockGetSiteSettings: vi.fn() }));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));
vi.mock('@/lib/siteSettings', () => ({ getSiteSettings: mockGetSiteSettings }));

import { GET as expiringListingsGet } from '@/app/api/cron/expiring-listings/route';
import { GET as promoExpiryGet } from '@/app/api/cron/promo-expiry/route';

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(process.env, originalEnv);
  process.env.CRON_SECRET = 'cron-secret';
  process.env.ADMIN_API_SECRET = 'admin-secret';
  mockGetSiteSettings.mockResolvedValue({
    promoApplicationCutoff: '2026-08-01T00:00:00Z',
    promoExpiresAt: '2026-10-31T23:59:59Z',
    advertiserTrialDays: 14,
    dealerDefaultTrialDays: 180,
  });
});
afterEach(() => { global.fetch = originalFetch; });

describe('GET /api/cron/expiring-listings', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    const res: any = await expiringListingsGet(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('delegates to the email route and forwards its response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ ok: true, sent: 3 }) }));
    const res: any = await expiringListingsGet(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, sent: 3 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/email/expiring-listings'),
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer admin-secret' } }),
    );
  });
});

describe('GET /api/cron/promo-expiry', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    const res: any = await promoExpiryGet(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('skips as too early — before 14 days prior to the configured promo cutoff', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    const res: any = await promoExpiryGet(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(true);
    expect(res._data.skipped).toBe(true);
    expect(res._data.reason).toContain('2026-10-17');
    vi.useRealTimers();
  });

  it('skips as promo period over — after 1 day past the configured promo cutoff', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T00:00:00Z'));
    const res: any = await promoExpiryGet(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(true);
    expect(res._data.skipped).toBe(true);
    expect(res._data.reason).toContain('2026-11-01');
    vi.useRealTimers();
  });

  it('uses a custom promo_expires_at from site settings to shift the send window', async () => {
    mockGetSiteSettings.mockResolvedValue({
      promoApplicationCutoff: '2026-08-01T00:00:00Z',
      promoExpiresAt: '2027-01-31T23:59:59Z',
      advertiserTrialDays: 14,
      dealerDefaultTrialDays: 180,
    });
    vi.useFakeTimers();
    // Well within the old hardcoded Oct 17 - Nov 1 window, but before the new
    // Jan 17, 2027 window derived from the custom cutoff — should now skip as too early.
    vi.setSystemTime(new Date('2026-10-20T00:00:00Z'));
    const res: any = await promoExpiryGet(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, skipped: true, reason: expect.stringContaining('2027-01-17') });
    vi.useRealTimers();
  });

  it('delegates to the email route during the active window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T00:00:00Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ ok: true, sent: 5 }) }));
    const res: any = await promoExpiryGet(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, sent: 5 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/email/promo-expiry'),
      expect.objectContaining({ method: 'POST' }),
    );
    vi.useRealTimers();
  });
});
