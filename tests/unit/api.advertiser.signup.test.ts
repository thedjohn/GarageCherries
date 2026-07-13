import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockFrom, mockCreateUser, mockDeleteUser, mockRateLimit, mockGetClientIP, mockNotifyAdmin, mockGetSiteSettings,
} = vi.hoisted(() => ({
  mockFrom:        vi.fn(),
  mockCreateUser:  vi.fn(),
  mockDeleteUser:  vi.fn(),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
  mockNotifyAdmin: vi.fn(),
  mockGetSiteSettings: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { createUser: mockCreateUser, deleteUser: mockDeleteUser } },
  })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/siteSettings', () => ({ getSiteSettings: mockGetSiteSettings }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/advertiser/signup/route';

const originalEnv = { ...process.env };
afterEach(() => { Object.assign(process.env, originalEnv); });

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

function noExistingAdvertisers() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'advertisers') {
      return {
        select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [] }) }),
        insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' }, error: null }) }) }),
      };
    }
    return {};
  });
}

const validBody = { email: 'biz@x.com', password: 'password123', businessName: 'Classic Detailing', cfToken: 'token' };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.TURNSTILE_SECRET_KEY;
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockCreateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockGetSiteSettings.mockResolvedValue({
    promoApplicationCutoff: '2026-08-01T00:00:00Z',
    promoExpiresAt: '2026-10-31T23:59:59Z',
    advertiserTrialDays: 14,
    dealerDefaultTrialDays: 180,
  });
  noExistingAdvertisers();
});

describe('POST /api/advertiser/signup', () => {
  it('returns 429 and notifies admin on first rate-limit block', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: true });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).toHaveBeenCalledOnce();
  });

  it('returns 429 without re-notifying on repeat blocks', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it.each(['email', 'password', 'businessName'])('returns 400 when %s is missing', async (field) => {
    const res: any = await POST(makeRequest({ ...validBody, [field]: '' }));
    expect(res._status).toBe(400);
  });

  it('skips CAPTCHA verification entirely when TURNSTILE_SECRET_KEY is not set', async () => {
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
  });

  describe('with TURNSTILE_SECRET_KEY set', () => {
    beforeEach(() => { process.env.TURNSTILE_SECRET_KEY = 'secret'; });

    it('returns 400 when Turnstile reports failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }));
      const res: any = await POST(makeRequest(validBody));
      expect(res._status).toBe(400);
    });

    it('returns 400 when the Turnstile request throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const res: any = await POST(makeRequest(validBody));
      expect(res._status).toBe(400);
    });

    it('proceeds when Turnstile succeeds', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }));
      const res: any = await POST(makeRequest(validBody));
      expect(res._status).toBe(200);
    });
  });

  it('returns 400 when auth user creation fails', async () => {
    mockCreateUser.mockResolvedValue({ data: null, error: { message: 'email taken' } });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(400);
  });

  it('rolls back the auth user and returns 500 when the advertiser insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [] }) }),
          insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(500);
    expect(mockDeleteUser).toHaveBeenCalledWith('user-1');
  });

  it('appends a numeric suffix to the slug when the base slug is already taken', async () => {
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [{ slug: 'classic-detailing' }] }) }),
          insert: vi.fn((arg) => { insertArg = arg; return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' }, error: null }) }) }; }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(insertArg.slug).toBe('classic-detailing-2');
  });

  it.each([
    ['starter', 15], ['metro', 30], ['regional', 60], ['statewide', 9999],
  ])('maps tier %s to radius %d', async (tier, radius) => {
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [] }) }),
          insert: vi.fn((arg) => { insertArg = arg; return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' }, error: null }) }) }; }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest({ ...validBody, tier }));
    expect(res._status).toBe(200);
    expect(insertArg.tier).toBe(tier);
    expect(insertArg.radius_miles).toBe(radius);
  });

  it('defaults tier to starter and category to other when omitted, with optional fields null', async () => {
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [] }) }),
          insert: vi.fn((arg) => { insertArg = arg; return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' }, error: null }) }) }; }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(insertArg).toMatchObject({
      tier: 'starter', category: 'other', radius_miles: 15,
      contact_name: null, phone: null, address: null, city: null, state: null, zip: null,
      description: null, website: null,
    });
    expect(res._data).toEqual({ ok: true, advertiserId: 'adv-1' });
  });

  it('uses a custom advertiserTrialDays from site settings, not the old hardcoded 14', async () => {
    vi.useFakeTimers();
    // After promoApplicationCutoff, so this exercises the day-count fallback
    // rather than the promo-window path (covered separately below).
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    mockGetSiteSettings.mockResolvedValue({
      promoApplicationCutoff: '2026-08-01T00:00:00Z',
      promoExpiresAt: '2026-10-31T23:59:59Z',
      advertiserTrialDays: 30,
      dealerDefaultTrialDays: 180,
    });
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [] }) }),
          insert: vi.fn((arg) => { insertArg = arg; return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' }, error: null }) }) }; }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(insertArg.trial_ends_at).toBe(new Date('2026-10-01T00:00:00Z').toISOString());
    vi.useRealTimers();
  });

  it('uses promoExpiresAt instead of advertiserTrialDays when signing up before promoApplicationCutoff', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T00:00:00Z'));
    mockGetSiteSettings.mockResolvedValue({
      promoApplicationCutoff: '2026-08-01T00:00:00Z',
      promoExpiresAt: '2026-12-31T23:59:59Z',
      advertiserTrialDays: 14,
      dealerDefaultTrialDays: 180,
    });
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [] }) }),
          insert: vi.fn((arg) => { insertArg = arg; return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' }, error: null }) }) }; }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(insertArg.trial_ends_at).toBe(new Date('2026-12-31T23:59:59Z').toISOString());
    vi.useRealTimers();
  });

  it('falls back to radius 15 for an unrecognized tier value', async () => {
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'advertisers') {
        return {
          select: vi.fn().mockReturnValue({ like: vi.fn().mockResolvedValue({ data: [] }) }),
          insert: vi.fn((arg) => { insertArg = arg; return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'adv-1' }, error: null }) }) }; }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest({ ...validBody, tier: 'bogus-tier' }));
    expect(res._status).toBe(200);
    expect(insertArg.radius_miles).toBe(15);
  });
});
