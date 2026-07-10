import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockGetUser, mockFrom, mockRpc, mockRateLimit, mockGetClientIP,
  mockVerifyTurnstile, mockNotifyAdmin, mockLoggerInfo, mockLoggerWarn, mockLoggerError, mockLoggerFlush,
} = vi.hoisted(() => ({
  mockGetUser:         vi.fn(),
  mockFrom:            vi.fn(),
  mockRpc:             vi.fn(),
  mockRateLimit:       vi.fn(),
  mockGetClientIP:     vi.fn(() => '1.2.3.4'),
  mockVerifyTurnstile: vi.fn(),
  mockNotifyAdmin:     vi.fn(),
  mockLoggerInfo:      vi.fn(),
  mockLoggerWarn:      vi.fn(),
  mockLoggerError:     vi.fn(),
  mockLoggerFlush:     vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
  getClientIP: mockGetClientIP,
}));

vi.mock('@/lib/verifyTurnstile', () => ({ verifyTurnstile: mockVerifyTurnstile }));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: mockLoggerWarn, error: mockLoggerError, flush: mockLoggerFlush }),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/listings/submit/route';

const originalEnv = { ...process.env };
afterEach(() => { Object.assign(process.env, originalEnv); });

function makeFormRequest(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return { formData: async () => fd } as unknown as NextRequest;
}

const validFields = {
  'cf-turnstile-response': 'token',
  state: 'MO',
  condition: 'Excellent',
  year: '1969',
  make: 'Dodge',
  model: 'Charger',
  price: '50000',
  city: 'St. Louis',
  bodyStyle: 'Coupe',
  transmission: 'Manual',
  description: 'Great car',
  imageUrls: JSON.stringify(['https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/cars/private/a.jpg']),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://comiuxnpvngcrvtgzpae.supabase.co';
  delete process.env.BETA_MODE;
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockVerifyTurnstile.mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1', email: 'seller@x.com' } } });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
    if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
    if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
    if (table === 'listings') return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
    return {};
  });
  mockRpc.mockResolvedValue({ error: null });
});

describe('POST /api/listings/submit', () => {
  it('returns 429 and notifies admin on first rate-limit block', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: true });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).toHaveBeenCalledOnce();
  });

  it('returns 429 without re-notifying admin on repeat rate-limit blocks', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it('returns 400 when CAPTCHA verification fails', async () => {
    mockVerifyTurnstile.mockResolvedValue(false);
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(400);
  });

  it('returns 403 when the seller is suspended', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'seller-1' } }) }) }) };
      return {};
    });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(403);
  });

  it('returns 403 BETA_EXPIRED when the dealer beta period has ended', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', beta_expires_at: '2020-01-01T00:00:00Z' } }) }) }) };
      return {};
    });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(403);
    expect(res._data.error).toBe('BETA_EXPIRED');
  });

  it('skips the dealer beta check entirely when BETA_MODE=true', async () => {
    process.env.BETA_MODE = 'true';
    const dealersFrom = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') { dealersFrom(); return {}; }
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(200);
    expect(dealersFrom).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid state code', async () => {
    const res: any = await POST(makeFormRequest({ ...validFields, state: 'ZZ' }));
    expect(res._status).toBe(400);
    expect(res._data.error).toMatch(/state/i);
  });

  it('returns 400 for an invalid condition value', async () => {
    const res: any = await POST(makeFormRequest({ ...validFields, condition: 'Mint' }));
    expect(res._status).toBe(400);
    expect(res._data.error).toMatch(/condition/i);
  });

  it('returns 403 LISTING_LIMIT when the RPC reports the private-seller cap (P0001)', async () => {
    mockRpc.mockResolvedValue({ error: { code: 'P0001', message: 'limit reached' } });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(403);
    expect(res._data.error).toBe('LISTING_LIMIT');
  });

  it('returns 500 on other RPC errors', async () => {
    mockRpc.mockResolvedValue({ error: { code: 'XXXXX', message: 'db down' } });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(500);
  });

  it('handles P0001 and other RPC errors for an unauthenticated submission (no sellerId)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockRpc.mockResolvedValue({ error: { code: 'P0001', message: 'limit reached' } });
    const res1: any = await POST(makeFormRequest(validFields));
    expect(res1._status).toBe(403);

    mockRpc.mockResolvedValue({ error: { code: 'XXXXX', message: 'db down' } });
    const res2: any = await POST(makeFormRequest(validFields));
    expect(res2._status).toBe(500);
  });

  it('passes mileage through when provided and falls back price to 0 when blank', async () => {
    const res: any = await POST(makeFormRequest({ ...validFields, mileage: '45000', price: '' }));
    expect(res._status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
      p_mileage: 45000,
      p_price: 0,
    }));
  });

  it('succeeds, using profile full_name/phone when set', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: 'Jane Seller', phone: '314-555-0100' } }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
      p_seller_name: 'Jane Seller',
      p_seller_phone: '314-555-0100',
    }));
  });

  it('succeeds for an unauthenticated submission (no sellerId), skipping suspension/dealer checks', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const suspendedFrom = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') { suspendedFrom(); return {}; }
      return {};
    });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(200);
    expect(suspendedFrom).not.toHaveBeenCalled();
  });

  it('filters out image URLs that are not from our storage bucket and caps at 20', async () => {
    const urls = [
      'https://evil.example.com/x.jpg',
      'not-a-url',
      ...Array.from({ length: 25 }, (_, i) => `https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/cars/private/${i}.jpg`),
    ];
    const res: any = await POST(makeFormRequest({ ...validFields, imageUrls: JSON.stringify(urls) }));
    expect(res._status).toBe(200);
    const call = mockRpc.mock.calls[0][1];
    expect(call.p_images).toHaveLength(20);
    expect(call.p_images.every((u: string) => u.includes('comiuxnpvngcrvtgzpae.supabase.co'))).toBe(true);
  });

  it('defaults to no images when imageUrls is omitted, and rejects non-string/wrong-path URLs', async () => {
    const { imageUrls: _omit, ...fieldsWithoutImages } = validFields;
    const res: any = await POST(makeFormRequest(fieldsWithoutImages));
    expect(res._status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_images: [] }));

    const mixedUrls = JSON.stringify([
      123,
      'https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/other-bucket/a.jpg',
      'https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/cars/private/good.jpg',
    ]);
    const res2: any = await POST(makeFormRequest({ ...validFields, imageUrls: mixedUrls }));
    expect(res2._status).toBe(200);
    const call = mockRpc.mock.calls[mockRpc.mock.calls.length - 1][1];
    expect(call.p_images).toEqual(['https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/cars/private/good.jpg']);
  });

  it('applies interiorColor/seatMaterial update after insert when provided', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { update };
      return {};
    });
    const res: any = await POST(makeFormRequest({ ...validFields, interiorColor: 'Black', seatMaterial: 'Leather' }));
    expect(res._status).toBe(200);
    expect(update).toHaveBeenCalledWith({ interior_color: 'Black', seat_material: 'Leather' });
  });

  it('applies only interiorColor when seatMaterial is blank', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { update };
      return {};
    });
    const res: any = await POST(makeFormRequest({ ...validFields, interiorColor: 'Black' }));
    expect(res._status).toBe(200);
    expect(update).toHaveBeenCalledWith({ interior_color: 'Black' });
  });

  it('skips the optional-fields update when neither interiorColor nor seatMaterial is provided', async () => {
    const update = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { update };
      return {};
    });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(200);
    expect(update).not.toHaveBeenCalled();
  });

  it('sets enforceListingLimit true when the user is not a dealer', async () => {
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_enforce_limit: true }));
  });

  it('sets enforceListingLimit false when the user is an active dealer', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', beta_expires_at: '2099-01-01T00:00:00Z' } }) }) }) };
      return {};
    });
    const res: any = await POST(makeFormRequest(validFields));
    expect(res._status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_enforce_limit: false }));
  });
});
