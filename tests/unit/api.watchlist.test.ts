import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRateLimit, mockGetClientIP } = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST, DELETE } from '@/app/api/watchlist/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeDeleteRequest(carId: string | null) {
  const url = carId ? `https://x.com/api/watchlist?carId=${carId}` : 'https://x.com/api/watchlist';
  return { url } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
});

describe('POST /api/watchlist', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await POST(makeRequest({ carId: 'car-1' }));
    expect(res._status).toBe(429);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makeRequest({ carId: 'car-1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when carId is missing', async () => {
    const res: any = await POST(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('toggles off (deletes) an existing watch', async () => {
    const del = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'watch-1' } }) }) }) }),
      delete: del,
    }));
    const res: any = await POST(makeRequest({ carId: 'car-1' }));
    expect(res._status).toBe(200);
    expect(res._data.watching).toBe(false);
    expect(del).toHaveBeenCalled();
  });

  it('creates a new watch with default allow_dealer_contact=true and price_at_add=0', async () => {
    const insert = vi.fn().mockResolvedValue({});
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
      insert,
    }));
    const res: any = await POST(makeRequest({ carId: 'car-1' }));
    expect(res._status).toBe(200);
    expect(res._data.watching).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ price_at_add: 0, allow_dealer_contact: true }));
  });

  it('respects an explicit currentPrice and allowDealerContact=false', async () => {
    const insert = vi.fn().mockResolvedValue({});
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
      insert,
    }));
    const res: any = await POST(makeRequest({ carId: 'car-1', currentPrice: 45000, allowDealerContact: false }));
    expect(res._status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ price_at_add: 45000, allow_dealer_contact: false }));
  });
});

describe('DELETE /api/watchlist', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await DELETE(makeDeleteRequest('car-1'));
    expect(res._status).toBe(401);
  });

  it('returns 400 when carId is missing', async () => {
    const res: any = await DELETE(makeDeleteRequest(null));
    expect(res._status).toBe(400);
  });

  it('deletes the watch and returns watching=false', async () => {
    const eq2 = vi.fn().mockResolvedValue({});
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    mockFrom.mockImplementation(() => ({ delete: vi.fn().mockReturnValue({ eq: eq1 }) }));
    const res: any = await DELETE(makeDeleteRequest('car-1'));
    expect(res._status).toBe(200);
    expect(res._data.watching).toBe(false);
  });
});
