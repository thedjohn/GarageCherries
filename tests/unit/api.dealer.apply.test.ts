import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockFrom, mockRateLimit, mockGetClientIP, mockVerifyTurnstile, mockNotifyAdmin,
} = vi.hoisted(() => ({
  mockFrom:            vi.fn(),
  mockRateLimit:       vi.fn(),
  mockGetClientIP:     vi.fn(() => '1.2.3.4'),
  mockVerifyTurnstile: vi.fn(),
  mockNotifyAdmin:     vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('@/lib/verifyTurnstile', () => ({ verifyTurnstile: mockVerifyTurnstile }));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn(async () => {}) }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/dealer/apply/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

const validBody = {
  name: 'John Doe',
  email: 'John@Example.com',
  phone: '314-555-0100',
  dealerName: 'Classic Cars Co',
  address: '123 Main St',
  location: 'St. Louis',
  state: 'mo',
  zip: '63101',
  website: 'https://classiccars.example.com',
  specialties: 'Muscle Cars, Classics',
  description: 'We sell classics.',
  captchaToken: 'token',
};

function noExistingRecords() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealer_applications') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'dealers') {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
    }
    return {};
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockVerifyTurnstile.mockResolvedValue(true);
  noExistingRecords();
});

describe('POST /api/dealer/apply', () => {
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

  it.each(['name', 'email', 'phone', 'dealerName', 'location', 'state', 'description'])(
    'returns 400 when %s is missing',
    async (field) => {
      const body = { ...validBody, [field]: '' };
      const res: any = await POST(makeRequest(body));
      expect(res._status).toBe(400);
    },
  );

  it('returns 400 for an invalid state code', async () => {
    const res: any = await POST(makeRequest({ ...validBody, state: 'ZZ' }));
    expect(res._status).toBe(400);
  });

  it('returns 409 when a dealer already exists for this email', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'dealer-1' } }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(409);
  });

  it('returns 409 when an application is already pending/approved', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'app-1', status: 'pending' } }) }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(409);
  });

  it('returns 500 when the insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }),
        };
      }
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(500);
  });

  it('succeeds, normalizing email/state and splitting specialties', async () => {
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }),
          insert: vi.fn((arg) => { insertArg = arg; return Promise.resolve({ error: null }); }),
        };
      }
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });

    const res: any = await POST(makeRequest(validBody));
    expect(res._status).toBe(200);
    expect(res._data.success).toBe(true);
    expect(insertArg).toMatchObject({
      email: 'john@example.com',
      state: 'MO',
      specialties: ['Muscle Cars', 'Classics'],
      status: 'pending',
    });
  });

  it('succeeds with optional fields omitted (address/zip/website null, specialties empty array)', async () => {
    let insertArg: any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealer_applications') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }),
          insert: vi.fn((arg) => { insertArg = arg; return Promise.resolve({ error: null }); }),
        };
      }
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });

    const { address, zip, website, specialties, ...rest } = validBody;
    const res: any = await POST(makeRequest(rest));
    expect(res._status).toBe(200);
    expect(insertArg).toMatchObject({ address: null, zip: null, website: null, specialties: [] });
  });
});
