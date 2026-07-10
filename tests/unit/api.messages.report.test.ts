import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRequireAdmin } = vi.hoisted(() => ({
  mockGetUser:      vi.fn(),
  mockFrom:         vi.fn(),
  mockRequireAdmin: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { PATCH, DELETE } from '@/app/api/messages/[id]/report/route';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
function makeReq() {
  return {} as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/messages/[id]/report', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await PATCH(makeReq(), makeParams('m1'));
    expect(res._status).toBe(401);
  });

  it('returns 404 when the message does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    const res: any = await PATCH(makeReq(), makeParams('m1'));
    expect(res._status).toBe(404);
  });

  it('returns 403 when the user is neither buyer nor seller', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'stranger' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { conversation_id: 'c1', conversations: { buyer_id: 'buyer-1', listing_id: 'l1', listings: { seller_id: 'seller-1' } } },
          }) }) }),
        };
      }
      return {};
    });
    const res: any = await PATCH(makeReq(), makeParams('m1'));
    expect(res._status).toBe(403);
  });

  it('allows the buyer to report and returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { conversation_id: 'c1', conversations: { buyer_id: 'buyer-1', listing_id: 'l1', listings: { seller_id: 'seller-1' } } },
          }) }) }),
          update: vi.fn().mockReturnValue({ eq }),
        };
      }
      return {};
    });
    const res: any = await PATCH(makeReq(), makeParams('m1'));
    expect(res._status).toBe(200);
    expect(eq).toHaveBeenCalledWith('id', 'm1');
  });

  it('allows the seller to report', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { conversation_id: 'c1', conversations: { buyer_id: 'buyer-1', listing_id: 'l1', listings: { seller_id: 'seller-1' } } },
          }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {};
    });
    const res: any = await PATCH(makeReq(), makeParams('m1'));
    expect(res._status).toBe(200);
  });

  it('handles a message with no nested conversation data (403)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { conversation_id: 'c1', conversations: null } }) }) }) };
      return {};
    });
    const res: any = await PATCH(makeReq(), makeParams('m1'));
    expect(res._status).toBe(403);
  });

  it('returns 500 when the update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { conversation_id: 'c1', conversations: { buyer_id: 'buyer-1', listing_id: 'l1', listings: { seller_id: 'seller-1' } } },
          }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
        };
      }
      return {};
    });
    const res: any = await PATCH(makeReq(), makeParams('m1'));
    expect(res._status).toBe(500);
  });
});

describe('DELETE /api/messages/[id]/report', () => {
  it('returns 401 when caller has no admin role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRequireAdmin.mockResolvedValue(null);
    const res: any = await DELETE(makeReq(), makeParams('m1'));
    expect(res._status).toBe(401);
  });

  it('clears the reported flag on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockRequireAdmin.mockResolvedValue('support');
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => ({ update: vi.fn().mockReturnValue({ eq }) }));

    const res: any = await DELETE(makeReq(), makeParams('m1'));
    expect(res._status).toBe(200);
    expect(eq).toHaveBeenCalledWith('id', 'm1');
  });

  it('returns 500 when the update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockRequireAdmin.mockResolvedValue('moderator');
    mockFrom.mockImplementation(() => ({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }) }));

    const res: any = await DELETE(makeReq(), makeParams('m1'));
    expect(res._status).toBe(500);
  });
});
