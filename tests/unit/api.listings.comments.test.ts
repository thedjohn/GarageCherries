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
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/emailBranding', () => ({ emailWrap: (body: string) => body }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: mockLoggerFlush }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/listings/[id]/comments/route';
import { DELETE } from '@/app/api/listings/[id]/comments/[commentId]/route';
import { PATCH } from '@/app/api/listings/[id]/comments/[commentId]/report/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }
function makeCommentParams(id: string, commentId: string) { return { params: Promise.resolve({ id, commentId }) }; }

const LISTING = { id: 'listing-1', title: 'TEST Car', seller_id: 'seller-1' };

function tableChain(overrides: Record<string, any>) {
  return (table: string) => {
    if (overrides[table]) return overrides[table];
    throw new Error(`Unexpected table: ${table}`);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
});

describe('POST /api/listings/[id]/comments', () => {
  it('returns 429 and notifies admin on first rate-limit block', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: true });
    const res: any = await POST(makeRequest({ body: 'hi' }), makeParams('listing-1'));
    expect(res._status).toBe(429);
    expect(mockNotifyAdmin).toHaveBeenCalledOnce();
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makeRequest({ body: 'hi', authorName: 'Bob' }), makeParams('listing-1'));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the user is suspended', async () => {
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'buyer-1' } }) }) }) },
    }));
    const res: any = await POST(makeRequest({ body: 'hi', authorName: 'Bob' }), makeParams('listing-1'));
    expect(res._status).toBe(403);
  });

  it('returns 400 when body or authorName is missing', async () => {
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
    }));
    const res: any = await POST(makeRequest({ body: '  ' }), makeParams('listing-1'));
    expect(res._status).toBe(400);
  });

  it('returns 404 when the listing does not exist', async () => {
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) },
    }));
    const res: any = await POST(makeRequest({ body: 'hi', authorName: 'Bob' }), makeParams('listing-1'));
    expect(res._status).toBe(404);
  });

  it('rejects a reply from a buyer who is not the seller (Q&A style, decided with Derek)', async () => {
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: LISTING }) }) }) },
      dealer_members: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) },
    }));
    const res: any = await POST(makeRequest({ body: 'me too!', parentId: 'q1', authorName: 'Other Buyer' }), makeParams('listing-1'));
    expect(res._status).toBe(403);
  });

  it('returns 404 when replying to a parent comment that does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1' } } });
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: LISTING }) }) }) },
      listing_comments: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) }) },
    }));
    const res: any = await POST(makeRequest({ body: 'answer', parentId: 'missing', authorName: 'Seller' }), makeParams('listing-1'));
    expect(res._status).toBe(404);
  });

  it('lets the seller reply, sets is_seller true, and emails the original asker immediately', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1' } } });
    const inserted = { id: 'reply-1', author_id: 'seller-1', author_name: 'Seller', is_seller: true, body: 'answer', parent_id: 'q1', created_at: '2026-09-07T00:00:00Z' };
    const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: inserted, error: null }) }) });
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: LISTING }) }) }) },
      listing_comments: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'q1', author_id: 'buyer-1' } }) }) }) }) }), insert: insertMock },
    }));
    mockGetUserById.mockResolvedValue({ data: { user: { id: 'buyer-1', email: 'buyer@x.com', user_metadata: {} } } });

    const res: any = await POST(makeRequest({ body: 'answer', parentId: 'q1', authorName: 'Seller' }), makeParams('listing-1'));
    expect(res._status).toBe(200);
    expect(res._data.comment).toEqual(inserted);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ is_seller: true, parent_id: 'q1' }));

    await vi.waitFor(() => expect(mockSend).toHaveBeenCalledOnce());
    expect(mockSend.mock.calls[0][0].to).toBe('buyer@x.com');
  });

  it('skips the reply email when the original asker opted out of listing-comment notifications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1' } } });
    const inserted = { id: 'reply-1', author_id: 'seller-1', author_name: 'Seller', is_seller: true, body: 'answer', parent_id: 'q1', created_at: '2026-09-07T00:00:00Z' };
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: LISTING }) }) }) },
      listing_comments: {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'q1', author_id: 'buyer-1' } }) }) }) }) }),
        insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: inserted, error: null }) }) }),
      },
    }));
    mockGetUserById.mockResolvedValue({ data: { user: { id: 'buyer-1', email: 'buyer@x.com', user_metadata: { listing_comment_opt_out: true } } } });

    const res: any = await POST(makeRequest({ body: 'answer', parentId: 'q1', authorName: 'Seller' }), makeParams('listing-1'));
    expect(res._status).toBe(200);
    await new Promise(r => setTimeout(r, 0));
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('lets any logged-in buyer post a new top-level question, and does NOT email immediately (batched by the hourly digest cron instead)', async () => {
    const inserted = { id: 'q1', author_id: 'buyer-1', author_name: 'Bob', is_seller: false, body: 'Still available?', parent_id: null, created_at: '2026-09-07T00:00:00Z' };
    const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: inserted, error: null }) }) });
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: LISTING }) }) }) },
      dealer_members: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) },
      listing_comments: { insert: insertMock },
    }));

    const res: any = await POST(makeRequest({ body: 'Still available?', authorName: 'Bob' }), makeParams('listing-1'));
    expect(res._status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ is_seller: false, parent_id: null }));
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('marks is_seller true when the seller posts a top-level comment on their own listing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1' } } });
    const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) });
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: LISTING }) }) }) },
      listing_comments: { insert: insertMock },
    }));
    const res: any = await POST(makeRequest({ body: 'Hi all', authorName: 'Seller' }), makeParams('listing-1'));
    expect(res._status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ is_seller: true }));
  });

  it('returns 500 when the insert fails', async () => {
    mockFrom.mockImplementation(tableChain({
      suspended_users: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
      listings: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: LISTING }) }) }) },
      dealer_members: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) },
      listing_comments: { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) },
    }));
    const res: any = await POST(makeRequest({ body: 'hi', authorName: 'Bob' }), makeParams('listing-1'));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/listings/[id]/comments/[commentId]', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await DELETE(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(401);
  });

  it('returns 404 when the comment does not exist', async () => {
    mockFrom.mockImplementation(tableChain({
      listing_comments: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }) },
    }));
    const res: any = await DELETE(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(404);
  });

  it('returns 403 when the caller is neither the author nor the seller/team', async () => {
    mockFrom.mockImplementation(tableChain({
      listing_comments: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', author_id: 'someone-else', listings: { seller_id: 'seller-1' } } }) }) }) }) },
      dealer_members: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }) },
    }));
    const res: any = await DELETE(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(403);
  });

  it('lets the comment author delete their own comment', async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(tableChain({
      listing_comments: {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', author_id: 'buyer-1', listings: { seller_id: 'seller-1' } } }) }) }) }),
        delete: vi.fn().mockReturnValue({ eq: deleteEq }),
      },
    }));
    const res: any = await DELETE(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(200);
    expect(deleteEq).toHaveBeenCalledWith('id', 'c1');
  });

  it('lets the listing seller (via dealer_members team membership) delete another user\'s comment', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'team-member-1' } } });
    mockFrom.mockImplementation(tableChain({
      listing_comments: {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', author_id: 'buyer-1', listings: { seller_id: 'dealer-1' } } }) }) }) }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      },
      dealer_members: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' } }) }) }) }) },
    }));
    const res: any = await DELETE(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(200);
  });

  it('returns 500 when the delete fails', async () => {
    mockFrom.mockImplementation(tableChain({
      listing_comments: {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', author_id: 'buyer-1', listings: { seller_id: 'seller-1' } } }) }) }) }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
      },
    }));
    const res: any = await DELETE(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(500);
  });
});

describe('PATCH /api/listings/[id]/comments/[commentId]/report', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await PATCH(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(401);
  });

  it('allows any logged-in user to report a comment (public content, unlike private-message reporting)', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    mockFrom.mockImplementation(tableChain({
      listing_comments: { update: vi.fn().mockReturnValue({ eq: eq1 }) },
    }));
    const res: any = await PATCH(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(200);
    expect(eq1).toHaveBeenCalledWith('id', 'c1');
    expect(eq2).toHaveBeenCalledWith('listing_id', 'listing-1');
  });

  it('returns 500 on a query error', async () => {
    mockFrom.mockImplementation(tableChain({
      listing_comments: { update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) }) },
    }));
    const res: any = await PATCH(makeRequest({}) as any, makeCommentParams('listing-1', 'c1'));
    expect(res._status).toBe(500);
  });
});
