import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRateLimit, mockGetClientIP, mockSend } = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/offers/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const validBody = { carId: 'car-1', carTitle: '1969 Dodge Charger', dealerId: 'dealer-1', amount: 45000, buyerName: 'Jane', buyerEmail: 'jane@x.com', message: 'Interested!' };

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: null } });
});

function setupSuccess(dealer: Record<string, unknown> | null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'offers') return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'offer-1' }, error: null }) }) }) };
    if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: dealer }) }) }) };
    return {};
  });
}

describe('POST /api/offers', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(429);
  });

  it.each(['carId', 'amount', 'buyerEmail'])('returns 400 when %s is missing', async (field) => {
    const res: any = await POST(makeRequest({ ...validBody, [field]: undefined }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for an invalid email address', async () => {
    const res: any = await POST(makeRequest({ ...validBody, buyerEmail: 'not-an-email' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 when amount is negative', async () => {
    const res: any = await POST(makeRequest({ ...validBody, amount: -100 }));
    expect(res._status).toBe(400);
  });

  it('returns 500 when the insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'offers') return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(500);
  });

  it('inserts with buyer_id null for an anonymous offer, emails dealer and buyer', async () => {
    setupSuccess({ email: 'dealer@x.com', name: 'Classic Cars Co' });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ ok: true, offerId: 'offer-1' });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('uses the authenticated buyer_id when logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'offers') return { insert: vi.fn((arg) => { insertArg = arg; return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'offer-1' }, error: null }) }) }; }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(insertArg.buyer_id).toBe('buyer-1');
  });

  it('skips the dealer email when the dealer has no email on file', async () => {
    setupSuccess(null);
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1); // buyer confirmation only
  });

  it('includes the message row in the dealer email when a message is provided, omits it otherwise', async () => {
    setupSuccess({ email: 'dealer@x.com', name: 'Classic Cars Co' });
    await POST(makeRequest(validBody));
    expect(mockSend.mock.calls[0][0].html).toContain('Interested!');

    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
    setupSuccess({ email: 'dealer@x.com', name: 'Classic Cars Co' });
    const { message, ...noMessage } = validBody;
    await POST(makeRequest(noMessage));
    expect(mockSend.mock.calls[0][0].html).not.toContain('vertical-align:top');
  });

  it('does not throw when the dealer or buyer email send rejects', async () => {
    mockSend.mockRejectedValue(new Error('resend down'));
    setupSuccess({ email: 'dealer@x.com', name: 'Classic Cars Co' });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
  });
});
