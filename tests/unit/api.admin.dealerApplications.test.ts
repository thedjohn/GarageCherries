import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin, mockGenerateLink, mockCreateUser, mockDeleteUser, mockSend, mockGetSiteSettings, mockNotifyAdmin } = vi.hoisted(() => ({
  mockGetUser:      vi.fn(),
  mockFrom:         vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockGenerateLink: vi.fn(),
  mockCreateUser:   vi.fn(),
  mockDeleteUser:   vi.fn(),
  mockSend:         vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockGetSiteSettings: vi.fn(),
  mockNotifyAdmin:  vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { generateLink: mockGenerateLink, createUser: mockCreateUser, deleteUser: mockDeleteUser } },
  })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin, hasRole: vi.fn((role: string, min: string) => {
  const order = ['support', 'moderator', 'admin', 'superadmin'];
  return order.indexOf(role) >= order.indexOf(min);
}) }));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/siteSettings', () => ({ getSiteSettings: mockGetSiteSettings }));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, PATCH } from '@/app/api/admin/dealer-applications/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  mockGenerateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.com/reset' } } });
  mockGetSiteSettings.mockResolvedValue({
    promoApplicationCutoff: '2026-08-01T00:00:00Z',
    promoExpiresAt: '2026-10-31T23:59:59Z',
    advertiserTrialDays: 14,
    dealerDefaultTrialDays: 180,
  });
});

describe('GET /api/admin/dealer-applications', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await GET();
    expect(res._status).toBe(401);
  });

  it('returns applications', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: 'app-1' }], error: null }) }) });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.applications).toHaveLength(1);
  });

  it('returns 500 on a query error', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) });
    const res: any = await GET();
    expect(res._status).toBe(500);
  });

  it('enriches an approved application with the real beta_expires_at from the dealers table', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'app-1', email: 'dealer@x.com', status: 'approved', dealer_id: 'user-1' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'dealers') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [{ id: 'user-1', beta_expires_at: '2026-12-01T00:00:00Z' }] }),
          }),
        };
      }
      return {};
    });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.applications[0].beta_expires_at).toBe('2026-12-01T00:00:00Z');
  });

  it('does not query dealers and sets beta_expires_at to null for pending/rejected applications', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    const dealersSelect = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'app-1', email: 'a@x.com', status: 'pending', dealer_id: null }, { id: 'app-2', email: 'b@x.com', status: 'rejected', dealer_id: null }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'dealers') return { select: dealersSelect };
      return {};
    });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.applications.every((a: any) => a.beta_expires_at === null)).toBe(true);
    expect(dealersSelect).not.toHaveBeenCalled();
  });

  it('sets beta_expires_at to null for an approved application whose dealer_id is null (e.g. the dealer account was later deleted)', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    const dealersSelect = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'app-1', email: 'stale@x.com', status: 'approved', dealer_id: null }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'dealers') return { select: dealersSelect };
      return {};
    });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.applications[0].beta_expires_at).toBeNull();
    expect(dealersSelect).not.toHaveBeenCalled();
  });

  it('gracefully sets beta_expires_at to null when dealer_id is set but no matching dealer row is found', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'app-1', email: 'orphan@x.com', status: 'approved', dealer_id: 'ghost-1' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'dealers') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      return {};
    });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.applications[0].beta_expires_at).toBeNull();
  });
});

const baseApp = {
  id: 'app-1', email: 'dealer@x.com', name: 'John', dealer_name: 'Classic Cars Co',
  status: 'pending', location: 'STL', state: 'MO', created_at: '2026-01-01T00:00:00Z',
  specialties: ['Muscle'], phone: '314-555-0100',
};

function setupAppFetch(app: Record<string, unknown> | null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealer_applications') {
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: app, error: app ? null : { message: 'not found' } }) }) }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    }
    if (table === 'dealers') return { insert: vi.fn().mockResolvedValue({ error: null }) };
    if (table === 'profiles') return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
    return {};
  });
}

describe('PATCH /api/admin/dealer-applications', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id or action is missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await PATCH(makeRequest({ id: 'app-1' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for an invalid action', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'bogus' }));
    expect(res._status).toBe(400);
  });

  it('returns 404 when the application does not exist', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    setupAppFetch(null);
    const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
    expect(res._status).toBe(404);
  });

  describe('action: resend', () => {
    it('returns 409 when the application is not approved', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch({ ...baseApp, status: 'pending' });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'resend' }));
      expect(res._status).toBe(409);
    });

    it('returns 500 when link generation fails', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch({ ...baseApp, status: 'approved' });
      mockGenerateLink.mockResolvedValue({ data: { properties: {} } });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'resend' }));
      expect(res._status).toBe(500);
    });

    it('resends the setup email on success', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch({ ...baseApp, status: 'approved' });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'resend' }));
      expect(res._status).toBe(200);
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it('generates the recovery link with the dealer/login redirect (the only dealer URL in Supabase\'s allow-list)', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch({ ...baseApp, status: 'approved' });
      await PATCH(makeRequest({ id: 'app-1', action: 'resend' }));
      expect(mockGenerateLink).toHaveBeenCalledWith(expect.objectContaining({
        type: 'recovery',
        options: { redirectTo: 'https://www.garagecherries.com/dealer/login' },
      }));
    });

    it('returns 500 with the real error when Resend reports a send failure (rather than a false success)', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch({ ...baseApp, status: 'approved' });
      mockSend.mockResolvedValueOnce({ error: { message: 'Daily quota exceeded' } });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'resend' }));
      expect(res._status).toBe(500);
      expect(res._data.error).toContain('Daily quota exceeded');
    });
  });

  it('returns 409 when the application is no longer pending for approve/reject', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    setupAppFetch({ ...baseApp, status: 'approved' });
    const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'reject' }));
    expect(res._status).toBe(409);
  });

  describe('action: reject', () => {
    it('updates status, emails with a note, and returns success', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch(baseApp);
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'reject', rejection_note: 'Not a fit' }));
      expect(res._status).toBe(200);
      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend.mock.calls[0][0].html).toContain('Not a fit');
    });

    it('rejects without a note', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch(baseApp);
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'reject' }));
      expect(res._status).toBe(200);
    });

    it('returns 500 when the update fails', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockFrom.mockImplementation((table: string) => {
        if (table === 'dealer_applications') {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: baseApp, error: null }) }) }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
          };
        }
        return {};
      });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'reject' }));
      expect(res._status).toBe(500);
    });

    it('does not throw when the rejection email send rejects, and still notifies admin (not silently dropped)', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch(baseApp);
      mockSend.mockRejectedValueOnce(new Error('resend down'));
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'reject' }));
      expect(res._status).toBe(200);
      await new Promise(resolve => setImmediate(resolve)); // flush the fire-and-forget .then/.catch chain
      expect(mockNotifyAdmin).toHaveBeenCalledWith(
        'Dealer rejection email failed to send',
        expect.stringContaining('resend down')
      );
    });

    it('notifies admin when the rejection email send resolves with an error (the SDK does not throw for most failures)', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch(baseApp);
      mockSend.mockResolvedValueOnce({ error: { message: 'Daily quota exceeded' } });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'reject' }));
      expect(res._status).toBe(200);
      await new Promise(resolve => setImmediate(resolve));
      expect(mockNotifyAdmin).toHaveBeenCalledWith(
        'Dealer rejection email failed to send',
        expect.stringContaining('Daily quota exceeded')
      );
    });
  });

  describe('action: approve', () => {
    it('returns 500 when auth user creation fails', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      setupAppFetch(baseApp);
      mockCreateUser.mockResolvedValue({ data: null, error: { message: 'email taken' } });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(500);
    });

    it('rolls back the auth user and returns 500 when the dealer insert fails', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'dealer_applications') {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: baseApp, error: null }) }) }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === 'dealers') return { insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate slug' } }) };
        return {};
      });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(500);
      expect(mockDeleteUser).toHaveBeenCalledWith('new-user-1');
    });

    it('links the approved application to the newly created dealer via dealer_id', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'dealer_applications') {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: baseApp, error: null }) }) }),
            update,
          };
        }
        if (table === 'dealers') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        if (table === 'profiles') return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        return {};
      });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(200);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ dealer_id: 'new-user-1' }));
    });

    it('approves with promo expiry for applications submitted before Aug 1 2026', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      setupAppFetch({ ...baseApp, created_at: '2026-07-01T00:00:00Z' });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(200);
      expect(res._data.userId).toBe('new-user-1');
      expect(mockSend.mock.calls[0][0].html).toContain('free promo plan');
    });

    it('approves with the default 180-day beta expiry for applications submitted after Aug 1 2026', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      setupAppFetch({ ...baseApp, created_at: '2026-09-01T00:00:00Z' });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(200);
      expect(mockSend.mock.calls[0][0].html).toContain('180-day beta plan');
    });

    it('uses a custom promo cutoff / expiry / trial length from site settings, proving the code reads them rather than the old hardcoded values', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      // Custom settings: promo window pushed to Sept 2026, expiring Dec 2026; standard trial 90 days
      mockGetSiteSettings.mockResolvedValue({
        promoApplicationCutoff: '2026-09-01T00:00:00Z',
        promoExpiresAt: '2026-12-01T23:59:59Z',
        advertiserTrialDays: 14,
        dealerDefaultTrialDays: 90,
      });
      const insert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'dealer_applications') {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { ...baseApp, created_at: '2026-08-15T00:00:00Z' }, error: null }) }) }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === 'dealers') return { insert };
        if (table === 'profiles') return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        return {};
      });
      // Application submitted Aug 15 — would have qualified for the OLD hardcoded promo cutoff
      // (before Aug 1) as "after" it, but under the new custom cutoff (Sept 1) it's still "before",
      // so it should get the custom promo expiry (Dec 1), not a rolling trial.
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(200);
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ beta_expires_at: '2026-12-01T23:59:59.000Z' }));
      expect(mockSend.mock.calls[0][0].html).toContain('free promo plan through December 1, 2026');
    });

    it('shows a contact-us fallback in the email when link generation fails', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      setupAppFetch(baseApp);
      mockGenerateLink.mockResolvedValue({ data: { properties: {} } });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(200);
      expect(mockSend.mock.calls[0][0].html).toContain('support@garagecherries.com');
    });

    it('generates the recovery link with the dealer/login redirect (the only dealer URL in Supabase\'s allow-list)', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      setupAppFetch(baseApp);
      await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(mockGenerateLink).toHaveBeenCalledWith(expect.objectContaining({
        type: 'recovery',
        options: { redirectTo: 'https://www.garagecherries.com/dealer/login' },
      }));
    });

    it('still returns success (account already created) but alerts admin when the approval email fails to send', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
      setupAppFetch(baseApp);
      mockSend.mockResolvedValueOnce({ error: { message: 'Daily quota exceeded' } });
      const res: any = await PATCH(makeRequest({ id: 'app-1', action: 'approve' }));
      expect(res._status).toBe(200);
      expect(res._data.userId).toBe('new-user-1');
      expect(mockNotifyAdmin).toHaveBeenCalledWith(
        'Dealer approval email failed to send',
        expect.stringContaining('Daily quota exceeded')
      );
    });
  });
});
