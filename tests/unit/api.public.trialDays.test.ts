import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  it('returns the current advertiser trial day count', async () => {
    mockGetSiteSettings.mockResolvedValue({
      promoApplicationCutoff: '2026-08-01T00:00:00.000Z',
      promoExpiresAt: '2026-10-31T23:59:59.000Z',
      advertiserTrialDays: 21,
      dealerDefaultTrialDays: 180,
    });

    const res = (await GET()) as unknown as { _data: { advertiserTrialDays: number } };

    expect(res._data).toEqual({ advertiserTrialDays: 21 });
  });
});
