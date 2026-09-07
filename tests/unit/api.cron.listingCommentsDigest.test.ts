import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockGetUserById, mockSend, mockLoggerError, mockLoggerInfo, mockLoggerFlush } = vi.hoisted(() => ({
  mockFrom:        vi.fn(),
  mockGetUserById: vi.fn(),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockLoggerError: vi.fn(),
  mockLoggerInfo:  vi.fn(),
  mockLoggerFlush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));
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

import { GET } from '@/app/api/cron/listing-comments-digest/route';

process.env.CRON_SECRET = 'test-secret';

function makeReq(auth?: string) {
  return { headers: { get: (name: string) => (name === 'Authorization' ? (auth ?? `Bearer test-secret`) : null) } } as unknown as NextRequest;
}

function tableChain(overrides: Record<string, any>) {
  return (table: string) => {
    if (overrides[table]) return overrides[table];
    throw new Error(`Unexpected table: ${table}`);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/cron/listing-comments-digest', () => {
  it('returns 401 without the correct cron secret', async () => {
    const res: any = await GET(makeReq('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('returns notified: 0 when there are no pending comments', async () => {
    mockFrom.mockImplementation(tableChain({
      listing_comments: { select: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) }) },
    }));
    const res: any = await GET(makeReq());
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ notified: 0, listings: 0 });
  });

  it('returns 500 when the initial query fails', async () => {
    mockFrom.mockImplementation(tableChain({
      listing_comments: { select: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) }) },
    }));
    const res: any = await GET(makeReq());
    expect(res._status).toBe(500);
  });

  it('groups multiple unnotified comments on the same listing into ONE digest email, then marks them all notified', async () => {
    const pending = [
      { id: 'c1', listing_id: 'listing-1', author_name: 'Alice', body: 'Still available?', listings: { title: '1967 Mustang', seller_id: 'seller-1' } },
      { id: 'c2', listing_id: 'listing-1', author_name: 'Bob', body: 'Any rust?', listings: { title: '1967 Mustang', seller_id: 'seller-1' } },
    ];
    const updateIn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(tableChain({
      listing_comments: {
        select: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: pending, error: null }) }) }) }),
        update: vi.fn().mockReturnValue({ in: updateIn }),
      },
      dealers: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { notification_email: 'sales@mustang.com' } }) }) }) },
    }));
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'owner@mustang.com' } } });

    const res: any = await GET(makeReq());
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ notified: 2, listings: 1 });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe('sales@mustang.com');
    expect(mockSend.mock.calls[0][0].subject).toContain('2 new questions');
    expect(updateIn).toHaveBeenCalledWith('id', ['c1', 'c2']);
  });

  it('skips a listing when no seller email can be resolved', async () => {
    const pending = [{ id: 'c1', listing_id: 'listing-1', author_name: 'Alice', body: 'hi', listings: { title: 'Car', seller_id: 'seller-1' } }];
    mockFrom.mockImplementation(tableChain({
      listing_comments: { select: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: pending, error: null }) }) }) }) },
      dealers: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
    }));
    mockGetUserById.mockResolvedValue({ data: { user: null } });

    const res: any = await GET(makeReq());
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ notified: 0, listings: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips a comment whose listing has no resolvable seller_id (defensive, should not happen)', async () => {
    const pending = [{ id: 'c1', listing_id: 'listing-1', author_name: 'Alice', body: 'hi', listings: null }];
    mockFrom.mockImplementation(tableChain({
      listing_comments: { select: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: pending, error: null }) }) }) }) },
    }));
    const res: any = await GET(makeReq());
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ notified: 0, listings: 0 });
  });

  it('continues to the next listing if one digest email send fails', async () => {
    const pending = [
      { id: 'c1', listing_id: 'listing-1', author_name: 'Alice', body: 'hi', listings: { title: 'Car One', seller_id: 'seller-1' } },
      { id: 'c2', listing_id: 'listing-2', author_name: 'Bob', body: 'hi', listings: { title: 'Car Two', seller_id: 'seller-2' } },
    ];
    const updateIn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(tableChain({
      listing_comments: {
        select: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: pending, error: null }) }) }) }),
        update: vi.fn().mockReturnValue({ in: updateIn }),
      },
      dealers: { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) },
    }));
    mockGetUserById
      .mockResolvedValueOnce({ data: { user: { email: 'owner1@x.com' } } })
      .mockResolvedValueOnce({ data: { user: { email: 'owner2@x.com' } } });
    mockSend.mockRejectedValueOnce(new Error('resend down')).mockResolvedValueOnce({ id: 'email-2' });

    const res: any = await GET(makeReq());
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ notified: 1, listings: 1 });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
