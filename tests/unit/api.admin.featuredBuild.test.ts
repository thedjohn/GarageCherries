import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetUser:        vi.fn(),
  mockFrom:           vi.fn(),
  mockRequireAdmin:   vi.fn(),
  mockRevalidatePath: vi.fn(),
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
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST, PATCH, DELETE } from '@/app/api/admin/featured-build/route';

const makeGetRequest = () => ({}) as unknown as NextRequest;
const makeRequest = (body: Record<string, unknown>) => ({ json: async () => body }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@x.com' } } });
  mockRequireAdmin.mockResolvedValue('admin');
});

describe('auth (all methods)', () => {
  it.each([
    ['GET', () => GET(makeGetRequest())],
    ['POST', () => POST(makeRequest({ garage_vehicle_id: 'v1', featured_date: '2026-10-06' }))],
    ['PATCH', () => PATCH(makeRequest({ id: 'p1' }))],
    ['DELETE', () => DELETE(makeRequest({ id: 'p1' }))],
  ])('%s rejects users below admin', async (_m, call) => {
    mockRequireAdmin.mockResolvedValueOnce('moderator');
    const res: any = await call();
    expect(res._status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects signed-out users', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockRequireAdmin.mockResolvedValueOnce(null);
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });
});

describe('GET /api/admin/featured-build', () => {
  const chain = (result: unknown) => ({ select: () => ({ order: () => Promise.resolve(result) }) });

  it('returns picks', async () => {
    mockFrom.mockReturnValue(chain({ data: [{ id: 'p1' }], error: null }));
    const res: any = await GET(makeGetRequest());
    expect(res._data).toEqual({ picks: [{ id: 'p1' }] });
  });

  it('returns an empty list when there is no data', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    const res: any = await GET(makeGetRequest());
    expect(res._data).toEqual({ picks: [] });
  });

  it('returns 500 on a query error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'db down' } }));
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(500);
  });
});

describe('POST /api/admin/featured-build', () => {
  function insertChain(result: unknown, inserted: unknown[] = []) {
    mockFrom.mockReturnValue({
      insert: (row: unknown) => { inserted.push(row); return { select: () => ({ single: () => Promise.resolve(result) }) }; },
    });
  }

  it('requires a vehicle and a date', async () => {
    const res: any = await POST(makeRequest({ garage_vehicle_id: '  ', featured_date: '2026-10-06' }));
    expect(res._status).toBe(400);
    const res2: any = await POST(makeRequest({ garage_vehicle_id: 'v1' }));
    expect(res2._status).toBe(400);
  });

  it('creates a pick with trimmed fields, a null blank blurb, and revalidates /showcase', async () => {
    const inserted: any[] = [];
    insertChain({ data: { id: 'p1', featured_date: '2026-10-06' }, error: null }, inserted);
    const res: any = await POST(makeRequest({ garage_vehicle_id: ' v1 ', featured_date: ' 2026-10-06 ', blurb: '  ' }));
    expect(inserted[0]).toEqual({ garage_vehicle_id: 'v1', featured_date: '2026-10-06', blurb: null });
    expect(res._data.pick).toEqual({ id: 'p1', featured_date: '2026-10-06' });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/showcase');
  });

  it('keeps a non-blank blurb', async () => {
    const inserted: any[] = [];
    insertChain({ data: { id: 'p1' }, error: null }, inserted);
    await POST(makeRequest({ garage_vehicle_id: 'v1', featured_date: '2026-10-06', blurb: ' Great build ' }));
    expect(inserted[0].blurb).toBe('Great build');
  });

  it('returns 400 with a friendly message when the date is already taken', async () => {
    insertChain({ data: null, error: { code: '23505', message: 'duplicate key' } });
    const res: any = await POST(makeRequest({ garage_vehicle_id: 'v1', featured_date: '2026-10-06' }));
    expect(res._status).toBe(400);
    expect(res._data.error).toBe('A Featured Build is already set for that date.');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns 500 on any other insert error', async () => {
    insertChain({ data: null, error: { code: 'XX000', message: 'db down' } });
    const res: any = await POST(makeRequest({ garage_vehicle_id: 'v1', featured_date: '2026-10-06' }));
    expect(res._status).toBe(500);
    expect(res._data.error).toBe('db down');
  });
});

describe('PATCH /api/admin/featured-build', () => {
  function updateChain(error: unknown, updates: unknown[] = []) {
    mockFrom.mockReturnValue({ update: (u: unknown) => { updates.push(u); return { eq: () => Promise.resolve({ error }) }; } });
  }

  it('requires an id', async () => {
    const res: any = await PATCH(makeRequest({ blurb: 'x' }));
    expect(res._status).toBe(400);
  });

  it('only updates the fields that were sent, trimmed', async () => {
    const updates: any[] = [];
    updateChain(null, updates);
    const res: any = await PATCH(makeRequest({ id: 'p1', featured_date: ' 2026-10-07 ' }));
    expect(updates[0]).toEqual({ featured_date: '2026-10-07' });
    expect(res._data).toEqual({ success: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/showcase');
  });

  it('updates vehicle and clears a blank blurb', async () => {
    const updates: any[] = [];
    updateChain(null, updates);
    await PATCH(makeRequest({ id: 'p1', garage_vehicle_id: ' v2 ', blurb: '' }));
    expect(updates[0]).toEqual({ garage_vehicle_id: 'v2', blurb: null });
  });

  it('returns 400 on a duplicate date and 500 on other errors', async () => {
    updateChain({ code: '23505', message: 'dup' });
    const res: any = await PATCH(makeRequest({ id: 'p1', featured_date: '2026-10-07' }));
    expect(res._status).toBe(400);
    updateChain({ code: 'XX000', message: 'db down' });
    const res2: any = await PATCH(makeRequest({ id: 'p1', featured_date: '2026-10-07' }));
    expect(res2._status).toBe(500);
    expect(res2._data.error).toBe('db down');
  });
});

describe('DELETE /api/admin/featured-build', () => {
  function deleteChain(error: unknown) {
    mockFrom.mockReturnValue({ delete: () => ({ eq: () => Promise.resolve({ error }) }) });
  }

  it('requires an id', async () => {
    const res: any = await DELETE(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('deletes and revalidates /showcase', async () => {
    deleteChain(null);
    const res: any = await DELETE(makeRequest({ id: 'p1' }));
    expect(res._data).toEqual({ success: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/showcase');
  });

  it('returns 500 on a delete error', async () => {
    deleteChain({ message: 'db down' });
    const res: any = await DELETE(makeRequest({ id: 'p1' }));
    expect(res._status).toBe(500);
  });
});
