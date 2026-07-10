import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockFrom, mockRateLimit, mockGetClientIP, mockVerifyTurnstile, mockNotifyAdmin,
  mockSend, mockLoggerError, mockLoggerInfo, mockLoggerFlush,
} = vi.hoisted(() => ({
  mockFrom:            vi.fn(),
  mockRateLimit:       vi.fn(),
  mockGetClientIP:     vi.fn(() => '1.2.3.4'),
  mockVerifyTurnstile: vi.fn(),
  mockNotifyAdmin:     vi.fn(),
  mockSend:            vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockLoggerError:     vi.fn(),
  mockLoggerInfo:      vi.fn(),
  mockLoggerFlush:     vi.fn().mockResolvedValue(undefined),
}));

// The route module reads INQUIRY_FALLBACK_EMAIL into a module-level constant
// at import time, so it must be set before the static import below runs.
// vi.hoisted() callbacks execute before imports, unlike a plain top-level statement.
vi.hoisted(() => {
  process.env.INQUIRY_FALLBACK_EMAIL = 'fallback@garagecherries.com';
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('@/lib/verifyTurnstile', () => ({ verifyTurnstile: mockVerifyTurnstile }));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: mockLoggerFlush }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/inquire/route';

const originalEnv = { ...process.env };
afterEach(() => { Object.assign(process.env, originalEnv); });

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const validBody = { carId: 'car-1', carTitle: '1969 Dodge Charger', buyerName: 'Jane', buyerEmail: 'jane@x.com', buyerPhone: '314-555-0100', message: 'Is this still for sale?', captchaToken: 'token' };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INQUIRY_FALLBACK_EMAIL = 'fallback@garagecherries.com';
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockVerifyTurnstile.mockResolvedValue(true);
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
    if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
    if (table === 'inquiries') return { insert: vi.fn().mockResolvedValue({}) };
    return {};
  });
});

describe('POST /api/inquire', () => {
  it('returns 429 and notifies admin on first rate-limit block', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: true });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).toHaveBeenCalledOnce();
  });

  it('returns 429 without re-notifying on repeat blocks', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it('returns 400 when CAPTCHA fails', async () => {
    mockVerifyTurnstile.mockResolvedValue(false);
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(400);
  });

  it.each(['buyerName', 'buyerEmail', 'message'])('returns 400 when %s is missing', async (field) => {
    const res: any = await POST(makeRequest({ ...validBody, [field]: '' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for an invalid email address', async () => {
    const res: any = await POST(makeRequest({ ...validBody, buyerEmail: 'not-an-email' }));
    expect(res._status).toBe(400);
  });

  it('routes to the dealer email when the seller is a dealer', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'dealer-1', seller_name: 'Fallback Name', seller_email: 'fallback@listing.com' } }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { email: 'dealer@x.com', name: 'Classic Cars Co' } }) }) }) };
      if (table === 'inquiries') return { insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].to).toBe('dealer@x.com');
  });

  it('falls back to the listing seller_email when the dealer has no email', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'seller-1', seller_name: 'Seller Name', seller_email: 'seller@listing.com' } }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'inquiries') return { insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].to).toBe('seller@listing.com');
  });

  it('falls back to INQUIRY_FALLBACK_EMAIL when no seller can be resolved', async () => {
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].to).toBe('fallback@garagecherries.com');
  });

  it('returns 500 when no seller resolved and no fallback email is configured', async () => {
    // FALLBACK_EMAIL is captured at module-load time, so exercising the
    // "not configured" branch requires a fresh module instance.
    delete process.env.INQUIRY_FALLBACK_EMAIL;
    vi.resetModules();
    const { POST: freshPOST } = await import('@/app/api/inquire/route');
    const res: any = await freshPOST(makeRequest(validBody));
    expect(res._status).toBe(500);
  });

  it('continues (does not fail the request) when the listing lookup throws', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockRejectedValue(new Error('db down')) }) }) };
      if (table === 'inquiries') return { insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].to).toBe('fallback@garagecherries.com');
  });

  it('continues (does not fail the request) when storing the inquiry throws', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'inquiries') return { insert: vi.fn().mockRejectedValue(new Error('db down')) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('returns 500 when sending the email fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(500);
  });

  it('omits buyerPhone from the inquiry and email when not provided', async () => {
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'inquiries') return { insert: vi.fn((arg) => { insertArg = arg; return Promise.resolve({}); }) };
      return {};
    });
    const { buyerPhone, ...rest } = validBody;
    const res: any = await POST(makeRequest(rest));
    expect(res._status).toBe(200);
    expect(insertArg.buyer_phone).toBeNull();
  });
});
