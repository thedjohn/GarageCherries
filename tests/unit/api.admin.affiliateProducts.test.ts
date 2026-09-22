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

import { GET, POST, PATCH, DELETE } from '@/app/api/admin/affiliate-products/route';

function makeGetRequest() {
  return {} as unknown as NextRequest;
}
function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const validProduct = { name: 'Battery Tender', category: 'Battery Care', merchant: 'Amazon', affiliate_url: 'https://amazon.com/dp/X?tag=t-20' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@x.com' } } });
});

describe('GET /api/admin/affiliate-products', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });

  it('returns products ordered by category then display_order', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const order2 = vi.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: order1 }) });
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(200);
    expect(res._data.products).toEqual([{ id: 'p1' }]);
  });

  it('returns 500 on a query error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const order2 = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: order1 }) });
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(500);
  });
});

describe('POST /api/admin/affiliate-products', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await POST(makeRequest(validProduct));
    expect(res._status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await POST(makeRequest({ name: 'No category here' }));
    expect(res._status).toBe(400);
  });

  it('creates a product and revalidates /garage-gear', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const single = vi.fn().mockResolvedValue({ data: { id: 'p1', ...validProduct }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    const res: any = await POST(makeRequest(validProduct));
    expect(res._status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Battery Tender', category: 'Battery Care', active: true }));
    expect(mockRevalidatePath).toHaveBeenCalledWith('/garage-gear');
  });

  it('returns 500 on an insert error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }) });
    const res: any = await POST(makeRequest(validProduct));
    expect(res._status).toBe(500);
  });
});

describe('PATCH /api/admin/affiliate-products', () => {
  it('returns 401 when role is below admin', async () => {
    mockRequireAdmin.mockResolvedValue('moderator');
    const res: any = await PATCH(makeRequest({ id: 'p1', name: 'New Name' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await PATCH(makeRequest({ name: 'New Name' }));
    expect(res._status).toBe(400);
  });

  it('updates only the provided fields', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    const res: any = await PATCH(makeRequest({ id: 'p1', featured: true }));
    expect(res._status).toBe(200);
    expect(update).toHaveBeenCalledWith({ featured: true });
    expect(eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('updates every field when all are provided', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await PATCH(makeRequest({
      id: 'p1', name: ' Battery Tender ', image_url: ' https://x.com/a.jpg ', description: ' Keeps the battery topped off ',
      category: ' Battery Care ', merchant: ' Amazon ', affiliate_url: ' https://amazon.com/dp/X ', regular_url: ' https://amazon.com/dp/X-plain ',
      price: '29.99', featured: false, display_order: 3, active: false,
    }));
    expect(update).toHaveBeenCalledWith({
      name: 'Battery Tender', image_url: 'https://x.com/a.jpg', description: 'Keeps the battery topped off',
      category: 'Battery Care', merchant: 'Amazon', affiliate_url: 'https://amazon.com/dp/X', regular_url: 'https://amazon.com/dp/X-plain',
      price: 29.99, featured: false, display_order: 3, active: false,
    });
  });

  it('clears optional fields to null when sent as empty strings', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await PATCH(makeRequest({ id: 'p1', image_url: '', regular_url: '', price: '' }));
    expect(update).toHaveBeenCalledWith({ image_url: null, regular_url: null, price: null });
  });

  it('returns 500 on an update error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) });
    const res: any = await PATCH(makeRequest({ id: 'p1', active: false }));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/admin/affiliate-products', () => {
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

  it('deletes the product and revalidates /garage-gear', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) });
    const res: any = await DELETE(makeRequest({ id: 'p1' }));
    expect(res._status).toBe(200);
    expect(eq).toHaveBeenCalledWith('id', 'p1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/garage-gear');
  });

  it('returns 500 on a delete error', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) });
    const res: any = await DELETE(makeRequest({ id: 'p1' }));
    expect(res._status).toBe(500);
  });
});
