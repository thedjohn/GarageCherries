import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin, mockListUsers } = vi.hoisted(() => ({
  mockGetUser:      vi.fn(),
  mockFrom:         vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockListUsers:    vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, auth: { admin: { listUsers: mockListUsers } } })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST, DELETE } from '@/app/api/admin/team/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
});

describe('GET /api/admin/team', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await GET();
    expect(res._status).toBe(401);
  });

  it('returns team members for any admin role', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }], error: null }) }) });
    const res: any = await GET();
    expect(res._status).toBe(200);
    expect(res._data.team).toHaveLength(1);
  });

  it('returns 500 on a query error', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) });
    const res: any = await GET();
    expect(res._status).toBe(500);
  });
});

describe('POST /api/admin/team', () => {
  it('returns 401 when role is below superadmin', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await POST(makeRequest({ email: 'x@x.com', role: 'moderator' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 for invalid input', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await POST(makeRequest({ email: 'x@x.com', role: 'bogus' }));
    expect(res._status).toBe(400);
  });

  it('returns 500 when listing users fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: { message: 'db down' } });
    const res: any = await POST(makeRequest({ email: 'x@x.com', role: 'moderator' }));
    expect(res._status).toBe(500);
  });

  it('returns 404 when no account exists for that email', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    const res: any = await POST(makeRequest({ email: 'x@x.com', role: 'moderator' }));
    expect(res._status).toBe(404);
  });

  it('upserts the team member on success', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'target-1', email: 'x@x.com' }] }, error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });
    const res: any = await POST(makeRequest({ email: 'x@x.com', role: 'moderator' }));
    expect(res._status).toBe(200);
    expect(upsert).toHaveBeenCalledWith({ user_id: 'target-1', email: 'x@x.com', role: 'moderator' });
  });

  it('returns 500 when the upsert fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'target-1', email: 'x@x.com' }] }, error: null });
    mockFrom.mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) });
    const res: any = await POST(makeRequest({ email: 'x@x.com', role: 'moderator' }));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/admin/team', () => {
  it('returns 401 when role is below superadmin', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await DELETE(makeRequest({ user_id: 'u2' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when trying to remove yourself', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const res: any = await DELETE(makeRequest({ user_id: 'admin-1' }));
    expect(res._status).toBe(400);
  });

  it('removes the team member on success', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) });
    const res: any = await DELETE(makeRequest({ user_id: 'u2' }));
    expect(res._status).toBe(200);
  });

  it('returns 500 when the delete fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) });
    const res: any = await DELETE(makeRequest({ user_id: 'u2' }));
    expect(res._status).toBe(500);
  });
});
