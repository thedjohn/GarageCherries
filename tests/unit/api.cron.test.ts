import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

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

  it('skips as too early before Oct 17 2026', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    const res: any = await promoExpiryGet(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, skipped: true, reason: 'Too early — before Oct 17 2026' });
    vi.useRealTimers();
  });

  it('skips as promo period over after Nov 1 2026', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T00:00:00Z'));
    const res: any = await promoExpiryGet(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, skipped: true, reason: 'Promo period over — past Nov 1 2026' });
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
