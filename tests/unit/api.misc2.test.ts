import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockCreateSignedUploadUrl, mockGetPublicUrl, mockFetchMakes } = vi.hoisted(() => ({
  mockGetUser:                vi.fn(),
  mockFrom:                   vi.fn(),
  mockCreateSignedUploadUrl:  vi.fn(),
  mockGetPublicUrl:           vi.fn(),
  mockFetchMakes:             vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: vi.fn(() => ({ createSignedUploadUrl: mockCreateSignedUploadUrl, getPublicUrl: mockGetPublicUrl })) },
  })),
}));
vi.mock('@/lib/db', () => ({ fetchMakes: mockFetchMakes }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET as myListingsGet } from '@/app/api/listings/my/route';
import { POST as uploadImagePost } from '@/app/api/listings/upload-image/route';
import { GET as makesGet } from '@/app/api/makes/route';
import { GET as modelsGet } from '@/app/api/models/route';
import { GET as profileGet, POST as profilePost } from '@/app/api/account/profile/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeGetRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

// ── GET /api/listings/my ─────────────────────────────────────────────────────

describe('GET /api/listings/my', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await myListingsGet();
    expect(res._status).toBe(401);
  });

  it('returns the seller\'s listings', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: 'l1' }], error: null }) }) }) });
    const res: any = await myListingsGet();
    expect(res._status).toBe(200);
    expect(res._data.listings).toHaveLength(1);
  });

  it('returns 500 on a query error', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) });
    const res: any = await myListingsGet();
    expect(res._status).toBe(500);
  });
});

// ── POST /api/listings/upload-image ─────────────────────────────────────────

describe('POST /api/listings/upload-image', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await uploadImagePost(makeRequest({ fileName: 'a.jpg', contentType: 'image/jpeg' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when fileName or contentType is missing', async () => {
    const res: any = await uploadImagePost(makeRequest({ fileName: 'a.jpg' }));
    expect(res._status).toBe(400);
  });

  it('returns 500 when signed URL creation fails', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({ data: null, error: { message: 'storage down' } });
    const res: any = await uploadImagePost(makeRequest({ fileName: 'a.jpg', contentType: 'image/jpeg' }));
    expect(res._status).toBe(500);
  });

  it.each([
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/jpeg', 'jpg'],
    ['image/gif', 'jpg'],
  ])('picks the right extension for %s', async (contentType, expectedExt) => {
    mockCreateSignedUploadUrl.mockResolvedValue({ data: { signedUrl: 'https://x.com/signed', token: 'tok' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x.com/public' } });
    const res: any = await uploadImagePost(makeRequest({ fileName: 'a', contentType }));
    expect(res._status).toBe(200);
    expect(res._data.path).toMatch(new RegExp(`\\.${expectedExt}$`));
    expect(res._data.publicUrl).toBe('https://x.com/public');
  });
});

// ── GET /api/makes ───────────────────────────────────────────────────────────

describe('GET /api/makes', () => {
  it('returns the makes list from lib/db', async () => {
    mockFetchMakes.mockResolvedValue(['Chevrolet', 'Dodge', 'Ford']);
    const res: any = await makesGet();
    expect(res._status).toBe(200);
    expect(res._data.makes).toEqual(['Chevrolet', 'Dodge', 'Ford']);
  });
});

// ── GET /api/models ───────────────────────────────────────────────────────────

describe('GET /api/models', () => {
  it('returns an empty array when make is missing', async () => {
    const res: any = await modelsGet(makeGetRequest());
    expect(res._status).toBe(200);
    expect(res._data.models).toEqual([]);
  });

  it('returns unique, sorted, non-empty model names for approved+unsold listings', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [
      { model: 'Charger' }, { model: 'Challenger' }, { model: 'Charger' }, { model: '' },
    ] }) }) }) }) });
    const res: any = await modelsGet(makeGetRequest({ make: 'Dodge' }));
    expect(res._status).toBe(200);
    expect(res._data.models).toEqual(['Challenger', 'Charger']);
  });
});

// ── GET/POST /api/account/profile ────────────────────────────────────────────

describe('GET /api/account/profile', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await profileGet();
    expect(res._status).toBe(401);
  });

  it('returns the profile row when it exists', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'user-1', full_name: 'Jane' } }) }) }) });
    const res: any = await profileGet();
    expect(res._status).toBe(200);
    expect(res._data.profile.full_name).toBe('Jane');
  });

  it('returns a default empty profile shape when none exists', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) });
    const res: any = await profileGet();
    expect(res._status).toBe(200);
    expect(res._data.profile).toEqual({ id: 'user-1', full_name: '', phone: '' });
  });
});

describe('POST /api/account/profile', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await profilePost(makeRequest({ full_name: 'Jane' }));
    expect(res._status).toBe(401);
  });

  it('upserts the profile, defaulting missing fields to empty string', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });
    const res: any = await profilePost(makeRequest({}));
    expect(res._status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ full_name: '', phone: '' }));
  });

  it('returns 500 when the upsert fails', async () => {
    mockFrom.mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) });
    const res: any = await profilePost(makeRequest({ full_name: 'Jane', phone: '314' }));
    expect(res._status).toBe(500);
  });
});
