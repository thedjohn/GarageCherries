import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGetSiteSettings } = vi.hoisted(() => ({
  mockGetSiteSettings: vi.fn(),
}));

vi.mock('@/lib/siteSettings', () => ({ getSiteSettings: mockGetSiteSettings }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/public/trial-days/route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/public/trial-days', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('returns isPromo true and the promo expiry when before promoApplicationCutoff', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T00:00:00.000Z'));
    mockGetSiteSettings.mockResolvedValue({
      promoApplicationCutoff: '2026-08-01T00:00:00.000Z',
      promoExpiresAt: '2026-10-31T23:59:59.000Z',
      advertiserTrialDays: 21,
      dealerDefaultTrialDays: 180,
    });

    const res = (await GET()) as unknown as { _data: { advertiserTrialDays: number; isPromo: boolean; promoExpiresAt: string } };

    expect(res._data).toEqual({
      advertiserTrialDays: 21,
      isPromo: true,
      promoExpiresAt: '2026-10-31T23:59:59.000Z',
    });
  });

  it('returns isPromo false after promoApplicationCutoff', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    mockGetSiteSettings.mockResolvedValue({
      promoApplicationCutoff: '2026-08-01T00:00:00.000Z',
      promoExpiresAt: '2026-10-31T23:59:59.000Z',
      advertiserTrialDays: 21,
      dealerDefaultTrialDays: 180,
    });

    const res = (await GET()) as unknown as { _data: { isPromo: boolean } };

    expect(res._data.isPromo).toBe(false);
  });
});
