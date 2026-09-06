import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockCreateUser, mockGenerateLink, mockListUsers, mockGetUserById, mockSend } = vi.hoisted(() => ({
  mockGetUser:      vi.fn(),
  mockFrom:         vi.fn(),
  mockCreateUser:   vi.fn(),
  mockGenerateLink: vi.fn(),
  mockListUsers:    vi.fn(),
  mockGetUserById:  vi.fn(),
  mockSend:         vi.fn().mockResolvedValue({ id: 'email-1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: {
      createUser: mockCreateUser,
      generateLink: mockGenerateLink,
      listUsers: mockListUsers,
      getUserById: mockGetUserById,
    } },
  })),
}));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/emailBranding', () => ({ emailWrap: (body: string) => body }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST, DELETE } from '@/app/api/dealer/team/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const DEALER_ROW = { id: 'dealer-1', name: 'Beverly Hills Car Club' };

function mockDealerLookup(dealerRow: any) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: dealerRow }) }) }) };
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1' } } });
});

describe('GET /api/dealer/team', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await GET();
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller is neither the dealer nor a team member', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealer_members') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    const res: any = await GET();
    expect(res._status).toBe(403);
  });

  it('lists team members for the parent, resolving each email', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({
          data: [{ id: 'member-1', user_id: 'user-2', invited_at: '2026-09-06T00:00:00Z' }], error: null,
        }) }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'sales@bhcc.com' } } });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.team).toEqual([{ id: 'member-1', email: 'sales@bhcc.com', invitedAt: '2026-09-06T00:00:00Z' }]);
  });

  it('returns 500 on a query error listing members', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    const res: any = await GET();
    expect(res._status).toBe(500);
  });

  it('reports a null email for a member whose auth user has none resolvable', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({
          data: [{ id: 'member-1', user_id: 'user-2', invited_at: '2026-09-06T00:00:00Z' }], error: null,
        }) }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    mockGetUserById.mockResolvedValue({ data: { user: null } });
    const res: any = await GET();
    expect(res._data.team[0].email).toBeNull();
  });

  it('lists team members for a team member viewer too (any member can view)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'member-user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealer_members') {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === 'dealer_id') return { eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { dealer_id: 'dealer-1' } }) }) };
            return { eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.team).toEqual([]);
  });
});

describe('POST /api/dealer/team', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makeRequest({ email: 'sales@bhcc.com' }));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller is a team member, not the parent (cannot invite)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'member-user-1' } } });
    mockDealerLookup(null);
    const res: any = await POST(makeRequest({ email: 'sales@bhcc.com' }));
    expect(res._status).toBe(403);
  });

  it('returns 400 for an invalid email', async () => {
    mockDealerLookup(DEALER_ROW);
    const res: any = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 when email is missing entirely', async () => {
    mockDealerLookup(DEALER_ROW);
    const res: any = await POST(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('returns 500 when linking the new member fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') return { upsert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
    const res: any = await POST(makeRequest({ email: 'sales@bhcc.com' }));
    expect(res._status).toBe(500);
  });

  it('falls back to a contact-support message in the email when no action link is generated', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
    mockGenerateLink.mockResolvedValue({ data: { properties: {} } });
    const res: any = await POST(makeRequest({ email: 'sales@bhcc.com' }));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].html).toContain('support@garagecherries.com');
  });

  it('creates a new account, links it, and emails a set-password link', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });
    mockGenerateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.com/set-password' } } });

    const res: any = await POST(makeRequest({ email: 'Sales@BHCC.com' }));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ ok: true, isNewAccount: true });
    expect(mockCreateUser).toHaveBeenCalledWith({ email: 'sales@bhcc.com', email_confirm: true });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe('sales@bhcc.com');
    expect(mockSend.mock.calls[0][0].html).toContain('https://x.com/set-password');
  });

  it('falls back to linking an existing account when the email is already registered', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateUser.mockResolvedValue({ data: null, error: { message: 'A user with this email already exists' } });
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'existing-user-1', email: 'sales@bhcc.com' }] } });

    const res: any = await POST(makeRequest({ email: 'sales@bhcc.com' }));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ ok: true, isNewAccount: false });
    expect(mockGenerateLink).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].html).not.toContain('Set Your Password');
  });

  it('returns 500 when createUser fails and no existing account is found either', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateUser.mockResolvedValue({ data: null, error: { message: 'something else broke' } });
    mockListUsers.mockResolvedValue({ data: { users: [] } });

    const res: any = await POST(makeRequest({ email: 'sales@bhcc.com' }));
    expect(res._status).toBe(500);
  });

  it('returns 400 when the parent tries to invite themselves', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateUser.mockResolvedValue({ data: null, error: { message: 'A user with this email already exists' } });
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'dealer-1', email: 'owner@bhcc.com' }] } });

    const res: any = await POST(makeRequest({ email: 'owner@bhcc.com' }));
    expect(res._status).toBe(400);
  });
});

describe('DELETE /api/dealer/team', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await DELETE(makeRequest({ id: 'member-1' }));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the caller is a team member, not the parent (cannot remove)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'member-user-1' } } });
    mockDealerLookup(null);
    const res: any = await DELETE(makeRequest({ id: 'member-1' }));
    expect(res._status).toBe(403);
  });

  it('returns 400 when id is missing', async () => {
    mockDealerLookup(DEALER_ROW);
    const res: any = await DELETE(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('removes the member, scoped to this dealer', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') return { delete: vi.fn().mockReturnValue({ eq: eq1 }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    const res: any = await DELETE(makeRequest({ id: 'member-1' }));
    expect(res._status).toBe(200);
    expect(eq1).toHaveBeenCalledWith('id', 'member-1');
    expect(eq2).toHaveBeenCalledWith('dealer_id', 'dealer-1');
  });

  it('returns 500 when the delete fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: DEALER_ROW }) }) }) };
      if (table === 'dealer_members') return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    const res: any = await DELETE(makeRequest({ id: 'member-1' }));
    expect(res._status).toBe(500);
  });
});
