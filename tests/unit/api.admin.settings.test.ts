import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin, mockGetSiteSettings } = vi.hoisted(() => ({
  mockGetUser:        vi.fn(),
  mockFrom:           vi.fn(),
  mockRequireAdmin:   vi.fn(),
  mockGetSiteSettings: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin }));
vi.mock('@/lib/siteSettings', () => ({ getSiteSettings: mockGetSiteSettings }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, PATCH } from '@/app/api/admin/settings/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const validBody = {
  promoApplicationCutoff: '2026-08-01',
  promoExpiresAt: '2026-10-31',
  advertiserTrialDays: 14,
  dealerDefaultTrialDays: 180,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  mockGetSiteSettings.mockResolvedValue({
    promoApplicationCutoff: '2026-08-01T00:00:00.000Z',
    promoExpiresAt: '2026-10-31T23:59:59.000Z',
    advertiserTrialDays: 14,
    dealerDefaultTrialDays: 180,
  });
});

describe('GET /api/admin/settings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await GET();
    expect(res._status).toBe(401);
  });

  it('returns the current settings for any admin role', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.settings.advertiserTrialDays).toBe(14);
  });
});

describe('PATCH /api/admin/settings', () => {
  it('returns 401 when role is below superadmin', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await PATCH(makeRequest(validBody));
    expect(res._status).toBe(401);
  });

  it('returns 400 for an invalid promoApplicationCutoff', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await PATCH(makeRequest({ ...validBody, promoApplicationCutoff: 'not-a-date' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for an invalid promoExpiresAt', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await PATCH(makeRequest({ ...validBody, promoExpiresAt: '' }));
    expect(res._status).toBe(400);
  });

  it.each([0, -5, 1.5])('returns 400 for a non-positive-integer advertiserTrialDays (%s)', async (val) => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await PATCH(makeRequest({ ...validBody, advertiserTrialDays: val }));
    expect(res._status).toBe(400);
  });

  it.each([0, -1, 2.5])('returns 400 for a non-positive-integer dealerDefaultTrialDays (%s)', async (val) => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await PATCH(makeRequest({ ...validBody, dealerDefaultTrialDays: val }));
    expect(res._status).toBe(400);
  });

  it('upserts the settings row on success', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });
    const res: any = await PATCH(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      promo_application_cutoff: '2026-08-01T00:00:00.000Z',
      promo_expires_at: '2026-10-31T23:59:59.000Z',
      advertiser_trial_days: 14,
      dealer_default_trial_days: 180,
      updated_by: 'admin-1',
    }));
  });

  it('normalizes a full ISO string down to its date portion before storing', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });
    await PATCH(makeRequest({ ...validBody, promoApplicationCutoff: '2026-08-01T15:30:00Z' }));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ promo_application_cutoff: '2026-08-01T00:00:00.000Z' }));
  });

  it('returns 500 when the upsert fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockFrom.mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) });
    const res: any = await PATCH(makeRequest(validBody));
    expect(res._status).toBe(500);
  });
});
