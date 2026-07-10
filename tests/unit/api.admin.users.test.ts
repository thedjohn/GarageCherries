import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockGetUser, mockRequireAdmin, mockListUsers, mockGetUserById,
  mockUpdateUserById, mockDeleteUser, mockCreateUser, mockFrom,
  mockStorageRemove, mockSend,
} = vi.hoisted(() => ({
  mockGetUser:        vi.fn(),
  mockRequireAdmin:   vi.fn(),
  mockListUsers:      vi.fn(),
  mockGetUserById:    vi.fn(),
  mockUpdateUserById: vi.fn(),
  mockDeleteUser:     vi.fn(),
  mockCreateUser:     vi.fn(),
  mockFrom:           vi.fn(),
  mockStorageRemove:  vi.fn(),
  mockSend:           vi.fn().mockResolvedValue({ id: 'email-1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers:      mockListUsers,
        getUserById:    mockGetUserById,
        updateUserById: mockUpdateUserById,
        deleteUser:     mockDeleteUser,
        createUser:     mockCreateUser,
      },
    },
    from: mockFrom,
    storage: { from: vi.fn(() => ({ remove: mockStorageRemove })) },
  })),
}));

vi.mock('@/lib/admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/admin')>('@/lib/admin');
  return { ...actual, requireAdmin: mockRequireAdmin };
});

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      _data: data,
      _status: init?.status ?? 200,
    })),
  },
}));

import { GET, PATCH, DELETE, POST } from '@/app/api/admin/users/route';
import { NextResponse } from 'next/server';

function makeGetRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest;
}

function makeJsonRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default empty-but-valid shape for every `.from(table).select(...)` call in GET
  mockFrom.mockImplementation((table: string) => ({
    select: vi.fn().mockResolvedValue({ data: [] }),
  }));
});

// ── GET /api/admin/users ────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('returns 401 when caller has no admin role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue(null);

    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });

  it('returns 403 when caller is support (below moderator)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue('support');

    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(403);
  });

  it('classifies dealer/advertiser/seller/buyer/new/inactive correctly and paginates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');

    const now = new Date().toISOString();
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const authUsers = [
      { id: 'dealer-1',    email: 'd@x.com', created_at: now, last_sign_in_at: now, user_metadata: {} },
      { id: 'advertiser-1',email: 'a@x.com', created_at: now, last_sign_in_at: now, user_metadata: {} },
      { id: 'seller-1',    email: 's@x.com', created_at: now, last_sign_in_at: now, user_metadata: {} },
      { id: 'buyer-1',     email: 'b@x.com', created_at: now, last_sign_in_at: now, user_metadata: { full_name: 'Buyer One' } },
      { id: 'new-1',       email: 'n@x.com', created_at: now, last_sign_in_at: now, user_metadata: {} },
      { id: 'inactive-1',  email: 'i@x.com', created_at: twoYearsAgo, last_sign_in_at: twoYearsAgo, user_metadata: {} },
    ];

    mockFrom.mockImplementation((table: string) => {
      const data: Record<string, unknown[]> = {
        dealers:       [{ id: 'dealer-1', name: 'Dealer Co' }],
        advertisers:   [{ id: 'ad-1', user_id: 'advertiser-1', business_name: 'Ads Co' }],
        listings:      [
          { seller_id: 'seller-1', status: 'approved' },
          { seller_id: 'seller-1', status: 'pending' },
          { seller_id: 'seller-1', status: 'rejected' },
        ],
        suspended_users: [],
        watchlists:    [{ user_id: 'buyer-1' }],
        conversations: [{ buyer_id: 'buyer-1', listing_id: 'l1' }],
      };
      return { select: vi.fn().mockResolvedValue({ data: data[table] ?? [] }) };
    });
    mockListUsers.mockResolvedValue({ data: { users: authUsers } });

    const res: any = await GET(makeGetRequest({ page: '1', limit: '25' }));
    expect(res._status).toBe(200);
    const byId = Object.fromEntries(res._data.users.map((u: any) => [u.id, u]));
    expect(byId['dealer-1'].type).toBe('dealer');
    expect(byId['advertiser-1'].type).toBe('advertiser');
    expect(byId['seller-1'].type).toBe('seller');
    expect(byId['buyer-1'].roles).toContain('buyer');
    expect(byId['new-1'].roles).toContain('new');
    expect(byId['inactive-1'].roles).toContain('inactive');
    expect(res._data.total).toBe(6);
  });

  it('filters by role and status query params', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
    mockRequireAdmin.mockResolvedValue('admin');
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'u1', email: 'u1@x.com', created_at: new Date().toISOString(), last_sign_in_at: new Date().toISOString(), user_metadata: {} },
          { id: 'u2', email: 'u2@x.com', created_at: new Date().toISOString(), last_sign_in_at: new Date().toISOString(), user_metadata: {} },
        ],
      },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1', reason: 'spam', suspended_at: new Date().toISOString() }] }) };
      return { select: vi.fn().mockResolvedValue({ data: [] }) };
    });

    const res: any = await GET(makeGetRequest({ status: 'suspended' }));
    expect(res._status).toBe(200);
    expect(res._data.users.every((u: any) => u.suspended)).toBe(true);
  });

  it('filters out users that do not match the requested role and excludes suspended users under status=active', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
    mockRequireAdmin.mockResolvedValue('admin');
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'buyer-1', email: 'b@x.com', created_at: new Date().toISOString(), last_sign_in_at: new Date().toISOString(), user_metadata: {} },
          { id: 'dealer-1', email: 'd@x.com', created_at: new Date().toISOString(), last_sign_in_at: new Date().toISOString(), user_metadata: {} },
        ],
      },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockResolvedValue({ data: [{ id: 'dealer-1', name: 'Dealer Co' }] }) };
      if (table === 'suspended_users') return { select: vi.fn().mockResolvedValue({ data: [{ user_id: 'dealer-1', reason: 'x', suspended_at: new Date().toISOString() }] }) };
      if (table === 'watchlists') return { select: vi.fn().mockResolvedValue({ data: [{ user_id: 'buyer-1' }] }) };
      return { select: vi.fn().mockResolvedValue({ data: [] }) };
    });

    const res: any = await GET(makeGetRequest({ role: 'dealer', status: 'active' }));
    expect(res._status).toBe(200);
    // dealer-1 matches role but is suspended, so status=active excludes it too
    expect(res._data.users).toHaveLength(0);
  });
});

// ── PATCH /api/admin/users ───────────────────────────────────────────────────

describe('PATCH /api/admin/users', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'warn' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await PATCH(makeJsonRequest({ action: 'warn' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for an unknown action', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'bogus' }));
    expect(res._status).toBe(400);
  });

  describe('action: warn', () => {
    it('returns 401 when role is below moderator (support)', async () => {
      mockRequireAdmin.mockResolvedValue('support');
      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'warn' }));
      expect(res._status).toBe(401);
    });

    it('returns 404 when target user has no email', async () => {
      mockRequireAdmin.mockResolvedValue('moderator');
      mockGetUserById.mockResolvedValue({ data: { user: null } });
      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'warn' }));
      expect(res._status).toBe(404);
    });

    it('sends a warning email and returns success', async () => {
      mockRequireAdmin.mockResolvedValue('moderator');
      mockGetUserById.mockResolvedValue({ data: { user: { email: 'target@x.com' } } });
      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'warn', message: 'Please stop.' }));
      expect(mockSend).toHaveBeenCalledOnce();
      expect(res._data.success).toBe(true);
    });
  });

  describe('action: suspend', () => {
    it('returns 401 when role is below moderator', async () => {
      mockRequireAdmin.mockResolvedValue('support');
      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'suspend' }));
      expect(res._status).toBe(401);
    });

    it('upserts suspended_users and emails the user', async () => {
      mockRequireAdmin.mockResolvedValue('moderator');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
      mockGetUserById.mockResolvedValue({ data: { user: { email: 'target@x.com', user_metadata: { full_name: 'Target' } } } });
      const upsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'suspend', reason: 'spam' }));
      expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', reason: 'spam' }));
      expect(res._data.success).toBe(true);
    });

    it('suspends without a reason and without a target email (no notification sent)', async () => {
      mockRequireAdmin.mockResolvedValue('moderator');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
      mockGetUserById.mockResolvedValue({ data: { user: null } });
      const upsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'suspend' }));
      expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', reason: null }));
      expect(mockSend).not.toHaveBeenCalled();
      expect(res._data.success).toBe(true);
    });

    it('returns 500 when the upsert fails', async () => {
      mockRequireAdmin.mockResolvedValue('moderator');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
      mockGetUserById.mockResolvedValue({ data: { user: null } });
      mockFrom.mockImplementation(() => ({ upsert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'suspend' }));
      expect(res._status).toBe(500);
    });
  });

  describe('action: unsuspend', () => {
    it('returns 401 when role is below admin (moderator)', async () => {
      mockRequireAdmin.mockResolvedValue('moderator');
      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'unsuspend' }));
      expect(res._status).toBe(401);
    });

    it('deletes the suspension row on success', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ delete: vi.fn().mockReturnValue({ eq }) }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'unsuspend' }));
      expect(res._data.success).toBe(true);
    });

    it('returns 500 when the delete fails', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
      mockFrom.mockImplementation(() => ({ delete: vi.fn().mockReturnValue({ eq }) }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'unsuspend' }));
      expect(res._status).toBe(500);
    });
  });

  describe('action: edit', () => {
    it('returns 401 when role is below admin', async () => {
      mockRequireAdmin.mockResolvedValue('moderator');
      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'edit', name: 'New Name' }));
      expect(res._status).toBe(401);
    });

    it('updates name, email, and dealer fields', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ update: vi.fn().mockReturnValue({ eq }) }));

      const res: any = await PATCH(makeJsonRequest({
        id: 'u1', action: 'edit', name: 'New Name', email: 'new@x.com', dealer: { name: 'Dealer Co' },
      }));
      expect(mockUpdateUserById).toHaveBeenCalledWith('u1', { user_metadata: { full_name: 'New Name' } });
      expect(mockUpdateUserById).toHaveBeenCalledWith('u1', { email: 'new@x.com' });
      expect(res._data.success).toBe(true);
    });

    it('returns 500 when the dealer update fails', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
      mockFrom.mockImplementation(() => ({ update: vi.fn().mockReturnValue({ eq }) }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'edit', dealer: { name: 'X' } }));
      expect(res._status).toBe(500);
    });
  });

  describe('action: promote', () => {
    it('returns 401 when role is below superadmin (admin)', async () => {
      mockRequireAdmin.mockResolvedValue('admin');
      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'promote', dealer: {} }));
      expect(res._status).toBe(401);
    });

    it('inserts a dealer row on success', async () => {
      mockRequireAdmin.mockResolvedValue('superadmin');
      mockGetUserById.mockResolvedValue({ data: { user: { email: 'seller@x.com', user_metadata: { full_name: 'Seller' } } } });
      const insert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ insert }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'promote', dealer: { name: 'New Dealer', location: 'STL', state: 'MO' } }));
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', name: 'New Dealer', state: 'MO' }));
      expect(res._data.success).toBe(true);
    });

    it('returns 500 when the dealer insert fails', async () => {
      mockRequireAdmin.mockResolvedValue('superadmin');
      mockGetUserById.mockResolvedValue({ data: { user: { email: 'seller@x.com' } } });
      mockFrom.mockImplementation(() => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate' } }) }));

      const res: any = await PATCH(makeJsonRequest({ id: 'u1', action: 'promote', dealer: {} }));
      expect(res._status).toBe(500);
    });
  });
});

// ── DELETE /api/admin/users ──────────────────────────────────────────────────

describe('DELETE /api/admin/users', () => {
  it('returns 401 when role is below superadmin', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await DELETE(makeJsonRequest({ id: 'u1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await DELETE(makeJsonRequest({}));
    expect(res._status).toBe(400);
  });

  it('cascades deletes across related tables, removes storage images, and deletes the auth user', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
            { id: 'l1', images: ['https://x.supabase.co/storage/v1/object/public/listing-images/cars/private/a.jpg'] },
            { id: 'l2', images: [] },
          ] }) }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    });
    mockDeleteUser.mockResolvedValue({ error: null });

    const res: any = await DELETE(makeJsonRequest({ id: 'u1' }));
    expect(mockStorageRemove).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith('u1');
    expect(res._data.success).toBe(true);
  });

  it('skips storage cleanup when the user has no listings', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    });
    mockDeleteUser.mockResolvedValue({ error: null });

    const res: any = await DELETE(makeJsonRequest({ id: 'u1' }));
    expect(mockStorageRemove).not.toHaveBeenCalled();
    expect(res._data.success).toBe(true);
  });

  it('returns 500 when deleting the auth user fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    });
    mockDeleteUser.mockResolvedValue({ error: { message: 'boom' } });

    const res: any = await DELETE(makeJsonRequest({ id: 'u1' }));
    expect(res._status).toBe(500);
  });
});

// ── POST /api/admin/users (direct dealer creation) ──────────────────────────

describe('POST /api/admin/users', () => {
  it('returns 401 when role is below superadmin', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await POST(makeJsonRequest({ email: 'x@x.com', password: 'pw', dealerName: 'D' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await POST(makeJsonRequest({ email: 'x@x.com' }));
    expect(res._status).toBe(400);
  });

  it('returns 500 when auth user creation fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockCreateUser.mockResolvedValue({ data: null, error: { message: 'email taken' } });
    const res: any = await POST(makeJsonRequest({ email: 'x@x.com', password: 'pw', dealerName: 'D' }));
    expect(res._status).toBe(500);
  });

  it('returns 500 when the dealer insert fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
    mockFrom.mockImplementation(() => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate slug' } }) }));

    const res: any = await POST(makeJsonRequest({ email: 'x@x.com', password: 'pw', dealerName: 'D' }));
    expect(res._status).toBe(500);
  });

  it('creates the auth user and dealer row on success', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => ({ insert }));

    const res: any = await POST(makeJsonRequest({ email: 'x@x.com', password: 'pw', dealerName: 'Dealer Co', location: 'STL', state: 'MO' }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-user-1', name: 'Dealer Co', slug: 'dealer-co' }));
    expect(res._data).toEqual({ success: true, userId: 'new-user-1' });
  });
});
