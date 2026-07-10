import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockGetUser, mockFrom, mockGetUserById, mockRateLimit, mockGetClientIP, mockNotifyAdmin, mockSend, mockLoggerError, mockLoggerInfo, mockLoggerFlush,
} = vi.hoisted(() => ({
  mockGetUser:     vi.fn(),
  mockFrom:        vi.fn(),
  mockGetUserById: vi.fn(),
  mockRateLimit:   vi.fn(),
  mockGetClientIP: vi.fn(() => '1.2.3.4'),
  mockNotifyAdmin: vi.fn(),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockLoggerError: vi.fn(),
  mockLoggerInfo:  vi.fn(),
  mockLoggerFlush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
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

import { POST, GET } from '@/app/api/conversations/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeGetRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1', email: 'buyer@x.com', user_metadata: { full_name: 'Buyer One' } } } });
});

describe('POST /api/conversations', () => {
  it('returns 429 and notifies admin on first rate-limit block', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: true });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).toHaveBeenCalledOnce();
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the buyer is suspended', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'buyer-1' } }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(403);
  });

  it('returns 400 when listingId or message is missing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: '   ' }));
    expect(res._status).toBe(400);
  });

  it('returns 404 when the listing does not exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(404);
  });

  function setupNewConversation(sellerId: string | null, sellerEmailOnListing: string | null, sellerAuthEmail?: string) {
    const convInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'conv-1' } }) }) });
    const msgInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_email: sellerEmailOnListing, seller_id: sellerId, title: 'Listing Title' } }) }) }) };
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
          insert: convInsert,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'messages') return { insert: msgInsert };
      return {};
    });
    if (sellerAuthEmail !== undefined) {
      mockGetUserById.mockResolvedValue({ data: { user: { email: sellerAuthEmail } } });
    } else {
      mockGetUserById.mockResolvedValue({ data: { user: null } });
    }
    return { convInsert, msgInsert };
  }

  it('creates a new conversation, inserts the message, and emails the seller (auth email preferred)', async () => {
    setupNewConversation('seller-1', 'listing-fallback@x.com', 'seller-auth@x.com');
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'Is this still available?' }));
    expect(res._status).toBe(200);
    expect(res._data.conversationId).toBe('conv-1');
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe('seller-auth@x.com');
  });

  it('falls back to the listing seller_email when the seller has no auth account', async () => {
    setupNewConversation(null, 'listing-fallback@x.com');
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'Is this still available?' }));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].to).toBe('listing-fallback@x.com');
  });

  it('skips the email when no seller email can be resolved', async () => {
    setupNewConversation(null, null);
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'Is this still available?' }));
    expect(res._status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 500 when conversation creation fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_email: 's@x.com', seller_id: null, title: 'T' } }) }) }) };
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
          insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }),
        };
      }
      return {};
    });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(500);
  });

  it('returns 500 and logs when message insertion fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_email: 's@x.com', seller_id: null, title: 'T' } }) }) }) };
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'conv-existing' } }) }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'messages') return { insert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) };
      return {};
    });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(500);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('reuses an existing conversation and does not re-email the seller', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_email: 's@x.com', seller_id: null, title: 'T' } }) }) }) };
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'conv-existing' } }) }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        };
      }
      if (table === 'messages') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return {};
    });
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'follow up' }));
    expect(res._status).toBe(200);
    expect(res._data.conversationId).toBe('conv-existing');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('handles email send rejection without throwing', async () => {
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    setupNewConversation('seller-1', null, 'seller-auth@x.com');
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(200);
    await new Promise(process.nextTick);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('falls back to email when buyer has no full_name in user_metadata', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1', email: 'buyer@x.com', user_metadata: {} } } });
    const { convInsert } = setupNewConversation('seller-1', null, 'seller-auth@x.com');
    const res: any = await POST(makeRequest({ listingId: 'l1', message: 'hi' }));
    expect(res._status).toBe(200);
    expect(convInsert).toHaveBeenCalledWith(expect.objectContaining({ buyer_name: 'buyer@x.com' }));
  });

  it('uses the client-supplied listingTitle over the DB title when provided', async () => {
    const { convInsert } = setupNewConversation('seller-1', null, 'seller-auth@x.com');
    const res: any = await POST(makeRequest({ listingId: 'l1', listingTitle: 'Custom Title', message: 'hi' }));
    expect(res._status).toBe(200);
    expect(convInsert).toHaveBeenCalledWith(expect.objectContaining({ listing_title: 'Custom Title' }));
  });
});

describe('GET /api/conversations', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(401);
  });

  it('merges buyer and seller conversations, dedupes, sorts, and paginates', async () => {
    const buyerConvs = [
      { id: 'c1', last_message_at: '2026-01-01T00:00:00Z' },
      { id: 'shared', last_message_at: '2026-01-05T00:00:00Z' },
    ];
    const sellerConvs = [
      { id: 'c2', last_message_at: '2026-01-03T00:00:00Z' },
      { id: 'shared', last_message_at: '2026-01-05T00:00:00Z' },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversations') {
        // Called on the plain `supabase` client (buyer) and admin client (seller);
        // both are backed by the same mockFrom in this test's mocking setup, so
        // distinguish by call order isn't reliable — instead branch on `.in` usage.
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: buyerConvs }) }),
            in: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: sellerConvs }) }),
          }),
        };
      }
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'listing-1' }] }) }) };
      return {};
    });

    const res: any = await GET(makeGetRequest({ page: '1', limit: '20' }));
    expect(res._status).toBe(200);
    expect(res._data.total).toBe(3); // c1, c2, shared (deduped)
    expect(res._data.userId).toBe('buyer-1');
  });

  it('skips the seller conversation lookup when the user has no listings', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [] }) }) }) };
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      return {};
    });
    const res: any = await GET(makeGetRequest());
    expect(res._status).toBe(200);
    expect(res._data.total).toBe(0);
  });
});
