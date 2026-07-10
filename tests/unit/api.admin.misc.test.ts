import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin, mockStorageList, mockStorageRemove } = vi.hoisted(() => ({
  mockGetUser:       vi.fn(),
  mockFrom:          vi.fn(),
  mockRequireAdmin:  vi.fn(),
  mockStorageList:   vi.fn(),
  mockStorageRemove: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: vi.fn(() => ({ list: mockStorageList, remove: mockStorageRemove })) },
  })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST as cleanupImages } from '@/app/api/admin/cleanup-images/route';
import { GET as adminConvMessages } from '@/app/api/admin/conversations/[id]/messages/route';
import { GET as reportedGet } from '@/app/api/admin/reported/route';

function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }
function makeReq() { return {} as unknown as NextRequest; }

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
});

describe('POST /api/admin/cleanup-images', () => {
  it('returns 401 when role is below superadmin', async () => {
    mockRequireAdmin.mockResolvedValue('admin');
    const res: any = await cleanupImages();
    expect(res._status).toBe(401);
  });

  it('returns 500 when storage listing fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockFrom.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [] }) });
    mockStorageList.mockResolvedValue({ data: null, error: { message: 'storage down' } });
    const res: any = await cleanupImages();
    expect(res._status).toBe(500);
  });

  it('returns 500 when removal fails', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockFrom.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [] }) });
    mockStorageList.mockResolvedValue({ data: [{ name: 'orphan.jpg', created_at: '2020-01-01T00:00:00Z' }] });
    mockStorageRemove.mockResolvedValue({ error: { message: 'remove failed' } });
    const res: any = await cleanupImages();
    expect(res._status).toBe(500);
  });

  it('reports zero deletions when there are no orphans', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockFrom.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ images: ['https://x.com/listing-images/claimed.jpg'] }] }) });
    mockStorageList.mockResolvedValue({ data: [{ name: 'claimed.jpg', created_at: '2020-01-01T00:00:00Z' }] });
    const res: any = await cleanupImages();
    expect(res._status).toBe(200);
    expect(res._data.deleted).toBe(0);
  });

  it('deletes orphans older than 24h, skipping claimed and recent files', async () => {
    mockRequireAdmin.mockResolvedValue('superadmin');
    mockFrom.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ images: ['https://x.com/listing-images/claimed.jpg'] }] }) });
    mockStorageList.mockResolvedValue({
      data: [
        { name: 'claimed.jpg', created_at: '2020-01-01T00:00:00Z' },
        { name: 'recent-orphan.jpg', created_at: new Date().toISOString() },
        { name: 'old-orphan.jpg', created_at: '2020-01-01T00:00:00Z' },
        { name: 'no-date-orphan.jpg', created_at: null },
      ],
    });
    mockStorageRemove.mockResolvedValue({ error: null });
    const res: any = await cleanupImages();
    expect(res._status).toBe(200);
    expect(res._data.deleted).toBe(1);
    expect(res._data.paths).toEqual(['old-orphan.jpg']);
  });
});

describe('GET /api/admin/conversations/[id]/messages', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await adminConvMessages(makeReq(), makeParams('c1'));
    expect(res._status).toBe(401);
  });

  it('returns messages, defaulting to an empty array', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) });
    const res: any = await adminConvMessages(makeReq(), makeParams('c1'));
    expect(res._status).toBe(200);
    expect(res._data.messages).toEqual([]);
  });

  it('returns 500 on a query error', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) });
    const res: any = await adminConvMessages(makeReq(), makeParams('c1'));
    expect(res._status).toBe(500);
  });
});

describe('GET /api/admin/reported', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await reportedGet();
    expect(res._status).toBe(401);
  });

  it('returns reported messages', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: 'm1' }], error: null }) }) }) });
    const res: any = await reportedGet();
    expect(res._status).toBe(200);
    expect(res._data.reported).toHaveLength(1);
  });

  it('returns 500 on a query error', async () => {
    mockRequireAdmin.mockResolvedValue('support');
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) });
    const res: any = await reportedGet();
    expect(res._status).toBe(500);
  });
});
