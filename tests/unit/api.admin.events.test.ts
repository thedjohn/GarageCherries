import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin, mockPostEventToFacebook, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetUser:              vi.fn(),
  mockFrom:                 vi.fn(),
  mockRequireAdmin:         vi.fn(),
  mockPostEventToFacebook:  vi.fn().mockResolvedValue(undefined),
  mockRevalidatePath:       vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin, hasRole: vi.fn((role: string, min: string) => {
  const order = ['support', 'moderator', 'admin', 'superadmin'];
  return order.indexOf(role) >= order.indexOf(min);
}) }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn(async () => {}) }),
}));
vi.mock('@/lib/facebook/postToPage', () => ({ postEventToFacebook: mockPostEventToFacebook }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST, PATCH, DELETE } from '@/app/api/admin/events/route';

function makeGetRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest;
}
function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const validEvent = { name: 'Muscle Car Show', date: '2026-09-01', location: 'STL', state: 'mo', type: 'show' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@x.com' } } });
});

describe('GET /api/admin/events', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });

  it('returns events, filtered by status when provided', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ data: [{ id: 'e1' }], error: null });
    const order = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });
    const res: any = await GET(makeGetRequest({ status: 'pending' }));
    expect(res._status).toBe(200);
    expect(eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('returns 500 on a query error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(500);
  });
});

describe('POST /api/admin/events', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await POST(makeRequest(validEvent));
    expect(res._status).toBe(401);
  });

  it.each(['name', 'date', 'location', 'state'])('returns 400 when %s is missing', async (field) => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await POST(makeRequest({ ...validEvent, [field]: '' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for an invalid type', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await POST(makeRequest({ ...validEvent, type: 'bogus' }));
    expect(res._status).toBe(400);
  });

  it('returns 500 when the insert fails', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) });
    const res: any = await POST(makeRequest(validEvent));
    expect(res._status).toBe(500);
  });

  it('creates the event, posts to Facebook, and revalidates', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'e1', name: 'Muscle Car Show' }, error: null }) }) }) });
    const res: any = await POST(makeRequest(validEvent));
    expect(res._status).toBe(200);
    expect(mockPostEventToFacebook).toHaveBeenCalledOnce();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events');
  });
});

describe('PATCH /api/admin/events', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await PATCH(makeRequest({ id: 'e1', action: 'approve' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await PATCH(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('approves an event, posts to Facebook, and revalidates', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { slug: 'x', name: 'X' }, error: null }) }) }) }) });
    const res: any = await PATCH(makeRequest({ id: 'e1', action: 'approve' }));
    expect(res._status).toBe(200);
    expect(mockPostEventToFacebook).toHaveBeenCalledOnce();
  });

  it('rejects an event without posting to Facebook', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { slug: 'x', name: 'X' }, error: null }) }) }) }) });
    const res: any = await PATCH(makeRequest({ id: 'e1', action: 'reject' }));
    expect(res._status).toBe(200);
    expect(mockPostEventToFacebook).not.toHaveBeenCalled();
  });

  it('returns 500 when the approve/reject update fails', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) }) });
    const res: any = await PATCH(makeRequest({ id: 'e1', action: 'approve' }));
    expect(res._status).toBe(500);
  });

  it('performs a full edit when no action is given', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) });
    const res: any = await PATCH(makeRequest({ id: 'e1', ...validEvent }));
    expect(res._status).toBe(200);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events');
  });

  it('returns 500 when the full edit fails', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) });
    const res: any = await PATCH(makeRequest({ id: 'e1', ...validEvent }));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/admin/events', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await DELETE(makeRequest({ id: 'e1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await DELETE(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('deletes the event and revalidates', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
    const res: any = await DELETE(makeRequest({ id: 'e1' }));
    expect(res._status).toBe(200);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events');
  });

  it('returns 500 when the delete fails', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) });
    const res: any = await DELETE(makeRequest({ id: 'e1' }));
    expect(res._status).toBe(500);
  });
});
