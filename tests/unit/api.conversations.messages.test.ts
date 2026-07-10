import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockGetUser, mockFrom, mockChannelSend, mockRateLimit, mockGetClientIP, mockLoggerError, mockLoggerInfo, mockLoggerFlush,
} = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockChannelSend: vi.fn().mockResolvedValue(undefined),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
  mockLoggerError: vi.fn(),
  mockLoggerInfo:  vi.fn(),
  mockLoggerFlush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    channel: vi.fn(() => ({ send: mockChannelSend })),
  })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: mockLoggerFlush }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST } from '@/app/api/conversations/[id]/messages/route';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
function makeGetReq() {
  return {} as unknown as NextRequest;
}
function makePostReq(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1', email: 'buyer@x.com', user_metadata: { full_name: 'Buyer One' } } } });
});

function mockVerifyAccessAsBuyer(buyerId: string, listingId = 'listing-1') {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: buyerId, listing_id: listingId, listing_title: 'Title' } }) }) }) };
    return {};
  });
}

describe('GET /api/conversations/[id]/messages', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await GET(makeGetReq(), makeParams('conv-1'));
    expect(res._status).toBe(401);
  });

  it('returns 404 when the conversation does not exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await GET(makeGetReq(), makeParams('conv-1'));
    expect(res._status).toBe(404);
  });

  it('returns 404 when the user is neither buyer nor seller', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: 'other-buyer', listing_id: 'listing-1' } }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'other-seller' } }) }) }) };
      return {};
    });
    const res: any = await GET(makeGetReq(), makeParams('conv-1'));
    expect(res._status).toBe(404);
  });

  it('returns messages for the buyer', async () => {
    mockVerifyAccessAsBuyer('buyer-1');
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'm1', body: 'hi' }], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: 'buyer-1', listing_id: 'l1' } }) }) }) };
      if (table === 'messages') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }) };
      return {};
    });
    const res: any = await GET(makeGetReq(), makeParams('conv-1'));
    expect(res._status).toBe(200);
    expect(res._data.messages).toHaveLength(1);
  });

  it('grants access to the seller and returns 500 on a query error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: 'other-buyer', listing_id: 'l1' } }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'buyer-1' } }) }) }) };
      if (table === 'messages') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) };
      return {};
    });
    const res: any = await GET(makeGetReq(), makeParams('conv-1'));
    expect(res._status).toBe(500);
  });
});

describe('POST /api/conversations/[id]/messages', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await POST(makePostReq({ body: 'hi' }), makeParams('conv-1'));
    expect(res._status).toBe(429);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makePostReq({ body: 'hi' }), makeParams('conv-1'));
    expect(res._status).toBe(401);
  });

  it('returns 403 when suspended', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'buyer-1' } }) }) }) };
      return {};
    });
    const res: any = await POST(makePostReq({ body: 'hi' }), makeParams('conv-1'));
    expect(res._status).toBe(403);
  });

  it('returns 404 when access is denied', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makePostReq({ body: 'hi' }), makeParams('conv-1'));
    expect(res._status).toBe(404);
  });

  function setupAccessGranted(convData: Record<string, unknown>) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: convData }) }) }) };
      if (table === 'messages') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return {};
    });
  }

  it('returns 400 for an empty message body', async () => {
    setupAccessGranted({ buyer_id: 'buyer-1', listing_id: 'l1' });
    const res: any = await POST(makePostReq({ body: '   ' }), makeParams('conv-1'));
    expect(res._status).toBe(400);
  });

  it('returns 500 when the insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: 'buyer-1', listing_id: 'l1' } }) }) }) };
      if (table === 'messages') return { insert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) };
      return {};
    });
    const res: any = await POST(makePostReq({ body: 'hi' }), makeParams('conv-1'));
    expect(res._status).toBe(500);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('sends as buyer and broadcasts to the seller', async () => {
    // access-check `conversations` select happens first, then a second `conversations`
    // select (for recipient lookup) and a `listings` select for the seller id
    let convCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'conversations') {
        convCall++;
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: 'buyer-1', listing_id: 'l1', listing_title: 'Nice Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'seller-1' } }) }) }) };
      if (table === 'messages') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return {};
    });
    const res: any = await POST(makePostReq({ body: 'hi there' }), makeParams('conv-1'));
    expect(res._status).toBe(200);
    expect(mockChannelSend).toHaveBeenCalledWith(expect.objectContaining({
      event: 'new-message',
      payload: expect.objectContaining({ conversationId: 'conv-1' }),
    }));
  });

  it('sends as seller and broadcasts to the buyer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1', email: 'seller@x.com', user_metadata: {} } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: 'buyer-1', listing_id: 'l1', listing_title: 'Nice Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'seller-1' } }) }) }) };
      if (table === 'messages') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return {};
    });
    const res: any = await POST(makePostReq({ body: 'Thanks for your interest' }), makeParams('conv-1'));
    expect(res._status).toBe(200);
    expect(mockChannelSend).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ senderName: 'seller@x.com' }),
    }));
  });

  it('does not broadcast when no recipient can be resolved', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { buyer_id: 'buyer-1', listing_id: 'l1', listing_title: 'Nice Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: null } }) }) }) };
      if (table === 'messages') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return {};
    });
    const res: any = await POST(makePostReq({ body: 'hi' }), makeParams('conv-1'));
    expect(res._status).toBe(200);
    expect(mockChannelSend).not.toHaveBeenCalled();
  });
});
