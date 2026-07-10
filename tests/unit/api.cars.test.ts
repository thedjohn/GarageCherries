import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockListUsers, mockSend, mockRateLimit, mockGetClientIP } = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockListUsers:   vi.fn(),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, auth: { admin: { listUsers: mockListUsers } } })),
}));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST as soldPost } from '@/app/api/cars/sold/route';
import { POST as verifyVinPost } from '@/app/api/cars/verify-vin/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1' } } });
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
});

// ── POST /api/cars/sold ──────────────────────────────────────────────────────

describe('POST /api/cars/sold', () => {
  it('returns 400 when carId is missing', async () => {
    const res: any = await soldPost(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await soldPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller does not own the listing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'other-dealer', title: 'Car' } }) }) }) };
      return {};
    });
    const res: any = await soldPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(403);
  });

  it('returns 403 when the listing does not exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await soldPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(403);
  });

  it('returns 500 when the update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'dealer-1', title: 'Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
        };
      }
      return {};
    });
    const res: any = await soldPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(500);
  });

  it('marks sold, and notifies watchlist users fire-and-forget', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'dealer-1', title: 'Nice Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ user_id: 'buyer-1' }] }) }) };
      return {};
    });
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'buyer-1', email: 'buyer@x.com' }] } });
    const res: any = await soldPost(makeRequest({ carId: 'c1', soldPrice: 45000 }));
    expect(res._status).toBe(200);
    await new Promise(process.nextTick);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('skips notification entirely when there are no watchers', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'dealer-1', title: 'Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      return {};
    });
    const res: any = await soldPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(200);
    await new Promise(process.nextTick);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips notification when watcher users resolve to no emails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'dealer-1', title: 'Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === 'watchlists') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ user_id: 'buyer-1' }] }) }) };
      return {};
    });
    mockListUsers.mockResolvedValue({ data: { users: [] } });
    const res: any = await soldPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(200);
    await new Promise(process.nextTick);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ── POST /api/cars/verify-vin ────────────────────────────────────────────────

describe('POST /api/cars/verify-vin', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456' }));
    expect(res._status).toBe(429);
  });

  it('returns 400 when VIN is missing', async () => {
    const res: any = await verifyVinPost(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('flags a non-17-char VIN as pre-standard', async () => {
    const res: any = await verifyVinPost(makeRequest({ vin: '123456' }));
    expect(res._status).toBe(200);
    expect(res._data.preStandard).toBe(true);
  });

  it('rejects a 17-char VIN containing I/O/Q', async () => {
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XFI23456' }));
    expect(res._status).toBe(200);
    expect(res._data.vinValid).toBe(false);
  });

  it('returns unverified when the NHTSA request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456' }));
    expect(res._status).toBe(200);
    expect(res._data.verified).toBe(false);
    expect(res._data.message).toMatch(/unavailable/i);
  });

  it('returns unverified when the NHTSA response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456' }));
    expect(res._status).toBe(200);
    expect(res._data.verified).toBe(false);
  });

  function nhtsaResults(fields: Record<string, string>) {
    return { Results: Object.entries(fields).map(([Variable, Value]) => ({ Variable, Value })) };
  }

  it('returns invalid when NHTSA reports a non-zero error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => nhtsaResults({ 'Error Code': '1', Make: '', Model: '', 'Model Year': '' }) }));
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456' }));
    expect(res._status).toBe(200);
    expect(res._data.vinValid).toBe(false);
  });

  it('verifies when make/model/year all match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => nhtsaResults({ 'Error Code': '0', Make: 'FORD', Model: 'MUSTANG', 'Model Year': '1969' }) }));
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456', make: 'Ford', model: 'Mustang', year: '1969' }));
    expect(res._status).toBe(200);
    expect(res._data.verified).toBe(true);
    expect(res._data.makeMatch).toBe(true);
  });

  it('does not verify when a provided field explicitly mismatches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => nhtsaResults({ 'Error Code': '0', Make: 'FORD', Model: 'MUSTANG', 'Model Year': '1969' }) }));
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456', make: 'Chevrolet', model: 'Mustang', year: '1969' }));
    expect(res._status).toBe(200);
    expect(res._data.makeMatch).toBe(false);
    expect(res._data.verified).toBe(false);
  });

  it('treats an unprovided field as null and still verifies on partial match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => nhtsaResults({ 'Error Code': '0', Make: 'FORD', Model: 'MUSTANG', 'Model Year': '1969' }) }));
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456', make: 'Ford' }));
    expect(res._status).toBe(200);
    expect(res._data.modelMatch).toBeNull();
    expect(res._data.verified).toBe(true);
  });

  it('does not verify when nothing was provided to compare at all', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => nhtsaResults({ 'Error Code': '0', Make: 'FORD', Model: 'MUSTANG', 'Model Year': '1969' }) }));
    const res: any = await verifyVinPost(makeRequest({ vin: '1FAFP42X6XF123456' }));
    expect(res._status).toBe(200);
    expect(res._data.verified).toBe(false);
  });
});
