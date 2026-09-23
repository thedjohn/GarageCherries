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

import { GET, POST, PATCH, DELETE } from '@/app/api/admin/garagecherry-of-the-day/route';

function makeGetRequest() {
  return {} as unknown as NextRequest;
}
function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const validPick = { listing_id: 'listing-1', featured_date: '2026-09-24' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@x.com' } } });
});

describe('GET /api/admin/garagecherry-of-the-day', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });

  it('returns picks ordered by featured_date descending', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(200);
    expect(res._data.picks).toEqual([{ id: 'p1' }]);
  });

  it('returns 500 on a query error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(500);
  });
});

describe('POST /api/admin/garagecherry-of-the-day', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await POST(makeRequest(validPick));
    expect(res._status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await POST(makeRequest({ listing_id: 'listing-1' }));
    expect(res._status).toBe(400);
  });

  it('creates a pick and revalidates the public pages', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const single = vi.fn().mockResolvedValue({ data: { id: 'p1', ...validPick }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    const res: any = await POST(makeRequest(validPick));
    expect(res._status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ listing_id: 'listing-1', featured_date: '2026-09-24' }));
    expect(mockRevalidatePath).toHaveBeenCalledWith('/car-of-the-day');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/car-of-the-day/archive');
  });

  it('returns 400 with a friendly message when the date is already taken', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }) });
    const res: any = await POST(makeRequest(validPick));
    expect(res._status).toBe(400);
    expect(res._data.error).toContain('already set for that date');
  });

  it('returns 500 on an unexpected insert error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }) });
    const res: any = await POST(makeRequest(validPick));
    expect(res._status).toBe(500);
  });
});

describe('PATCH /api/admin/garagecherry-of-the-day', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await PATCH(makeRequest({ id: 'p1', short_description: 'x' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await PATCH(makeRequest({ short_description: 'x' }));
    expect(res._status).toBe(400);
  });

  it('updates only the provided fields', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    const res: any = await PATCH(makeRequest({ id: 'p1', short_description: 'A great find' }));
    expect(res._status).toBe(200);
    expect(update).toHaveBeenCalledWith({ short_description: 'A great find' });
    expect(eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('updates every field when all are provided', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await PATCH(makeRequest({
      id: 'p1', listing_id: ' listing-2 ', featured_date: ' 2026-09-25 ',
      short_description: ' nice ', interesting_facts: ' facts ',
      instagram_caption: ' caption ', instagram_reel_caption: ' reel ', hashtags: ' #classic ',
    }));
    expect(update).toHaveBeenCalledWith({
      listing_id: 'listing-2', featured_date: '2026-09-25',
      short_description: 'nice', interesting_facts: 'facts',
      instagram_caption: 'caption', instagram_reel_caption: 'reel', hashtags: '#classic',
    });
  });

  it('clears optional text fields to null when sent as empty strings', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await PATCH(makeRequest({ id: 'p1', short_description: '', interesting_facts: '' }));
    expect(update).toHaveBeenCalledWith({ short_description: null, interesting_facts: null });
  });

  it('returns 400 with a friendly message when the date is already taken', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) });
    const res: any = await PATCH(makeRequest({ id: 'p1', featured_date: '2026-09-24' }));
    expect(res._status).toBe(400);
    expect(res._data.error).toContain('already set for that date');
  });

  it('returns 500 on an unexpected update error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) });
    const res: any = await PATCH(makeRequest({ id: 'p1', short_description: 'x' }));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/admin/garagecherry-of-the-day', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await DELETE(makeRequest({ id: 'p1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await DELETE(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('deletes the pick and revalidates the public pages', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) });
    const res: any = await DELETE(makeRequest({ id: 'p1' }));
    expect(res._status).toBe(200);
    expect(eq).toHaveBeenCalledWith('id', 'p1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/car-of-the-day');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/car-of-the-day/archive');
  });

  it('returns 500 on a delete error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) });
    const res: any = await DELETE(makeRequest({ id: 'p1' }));
    expect(res._status).toBe(500);
  });
});
