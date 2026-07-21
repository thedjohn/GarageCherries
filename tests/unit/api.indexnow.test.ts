import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRateLimit, mockGetClientIP } = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@x.com' } } });
});

// ── lib/indexNow.ts ──────────────────────────────────────────────────────────

describe('submitToIndexNow', () => {
  it('POSTs the url list to the IndexNow endpoint', async () => {
    const { submitToIndexNow } = await import('@/lib/indexNow');
    await submitToIndexNow(['https://www.garagecherries.com/listings/ford/mustang/c1/1965-ford-mustang-c1']);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.indexnow.org/indexnow',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.host).toBe('www.garagecherries.com');
    expect(body.urlList).toEqual(['https://www.garagecherries.com/listings/ford/mustang/c1/1965-ford-mustang-c1']);
    expect(body.keyLocation).toMatch(/^https:\/\/www\.garagecherries\.com\/.+\.txt$/);
  });

  it('no-ops on an empty url list without calling fetch', async () => {
    const { submitToIndexNow } = await import('@/lib/indexNow');
    await submitToIndexNow([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('never throws, even if the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { submitToIndexNow } = await import('@/lib/indexNow');
    await expect(submitToIndexNow(['https://www.garagecherries.com/listings/ford/mustang'])).resolves.toBeUndefined();
  });
});

// ── POST /api/indexnow/submit ────────────────────────────────────────────────

describe('POST /api/indexnow/submit', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const { POST } = await import('@/app/api/indexnow/submit/route');
    const res: any = await POST(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(429);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import('@/app/api/indexnow/submit/route');
    const res: any = await POST(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when carId is missing', async () => {
    const { POST } = await import('@/app/api/indexnow/submit/route');
    const res: any = await POST(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('returns 404 when the listing is not owned by the caller', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'other-user' } }) }) }) });
    const { POST } = await import('@/app/api/indexnow/submit/route');
    const res: any = await POST(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(404);
  });

  it('submits the listing URL to IndexNow, fire-and-forget, on success', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
        data: { id: 'c1', make: 'Ford', model: 'Mustang', slug: '1965-ford-mustang-c1', seller_id: 'user-1' },
      }) }) }),
    });
    const { POST } = await import('@/app/api/indexnow/submit/route');
    const res: any = await POST(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(200);
    await new Promise(process.nextTick);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.indexnow.org/indexnow',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.urlList[0]).toBe('https://www.garagecherries.com/listings/ford/mustang/c1/1965-ford-mustang-c1');
  });
});
