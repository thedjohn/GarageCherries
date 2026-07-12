import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { getSiteSettings, DEFAULT_SITE_SETTINGS } from '@/lib/siteSettings';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSiteSettings', () => {
  it('returns the DB row, mapped to camelCase, when present', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              promo_application_cutoff: '2026-09-01T00:00:00Z',
              promo_expires_at: '2026-12-01T23:59:59Z',
              advertiser_trial_days: 30,
              dealer_default_trial_days: 90,
            },
            error: null,
          }),
        }),
      }),
    });
    const settings = await getSiteSettings();
    expect(settings).toEqual({
      promoApplicationCutoff: '2026-09-01T00:00:00Z',
      promoExpiresAt: '2026-12-01T23:59:59Z',
      advertiserTrialDays: 30,
      dealerDefaultTrialDays: 90,
    });
  });

  it('falls back to defaults when the row is missing', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
    });
    expect(await getSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });

  it('falls back to defaults on a query error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }),
    });
    expect(await getSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });

  it('falls back to defaults when the query throws', async () => {
    mockFrom.mockImplementation(() => { throw new Error('connection failed'); });
    expect(await getSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });

  it('falls back per-field to defaults when the row has partial/null columns', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { promo_application_cutoff: null, promo_expires_at: null, advertiser_trial_days: null, dealer_default_trial_days: null },
            error: null,
          }),
        }),
      }),
    });
    expect(await getSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });
});
