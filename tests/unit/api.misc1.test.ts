import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockRateLimit, mockGetClientIP, mockPostListingToFacebook, mockSend, mockLoggerInfo, mockLoggerError } = vi.hoisted(() => ({
  mockGetUser:               vi.fn(),
  mockFrom:                  vi.fn(),
  mockRateLimit:             vi.fn(),
  mockGetClientIP:           vi.fn(() => '1.2.3.4'),
  mockPostListingToFacebook: vi.fn().mockResolvedValue(undefined),
  mockSend:                  vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockLoggerInfo:            vi.fn(),
  mockLoggerError:           vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit, getClientIP: mockGetClientIP }));
vi.mock('@/lib/facebook/postToPage', () => ({ postListingToFacebook: mockPostListingToFacebook }));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: vi.fn(async () => {}) }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST as eventsSubmitPost } from '@/app/api/events/submit/route';
import { POST as postListingPost } from '@/app/api/facebook/post-listing/route';
import { POST as feedbackPost } from '@/app/api/feedback/route';
import { POST as renewPost } from '@/app/api/listings/[id]/renew/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, firstBlock: false });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@x.com' } } });
});

// ── POST /api/events/submit ──────────────────────────────────────────────────

const validEvent = { name: 'Muscle Car Show', date: '2026-09-01', location: 'STL', state: 'mo', type: 'show', description: 'A great show' };

describe('POST /api/events/submit', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await eventsSubmitPost(makeRequest(validEvent));
    expect(res._status).toBe(429);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await eventsSubmitPost(makeRequest(validEvent));
    expect(res._status).toBe(401);
  });

  it.each(['name', 'date', 'location', 'state', 'description'])('returns 400 when %s is missing', async (field) => {
    const res: any = await eventsSubmitPost(makeRequest({ ...validEvent, [field]: '' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for an invalid type', async () => {
    const res: any = await eventsSubmitPost(makeRequest({ ...validEvent, type: 'bogus' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for a non-2-letter state', async () => {
    const res: any = await eventsSubmitPost(makeRequest({ ...validEvent, state: 'Missouri' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for a malformed URL', async () => {
    const res: any = await eventsSubmitPost(makeRequest({ ...validEvent, url: 'not-a-url' }));
    expect(res._status).toBe(400);
  });

  it('accepts a valid http(s) URL', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'events') return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'e1', name: 'Muscle Car Show' }, error: null }) }) }) };
      return {};
    });
    const res: any = await eventsSubmitPost(makeRequest({ ...validEvent, url: 'https://example.com' }));
    expect(res._status).toBe(200);
  });

  it('returns 500 when the insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'events') return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }) }) };
      return {};
    });
    const res: any = await eventsSubmitPost(makeRequest(validEvent));
    expect(res._status).toBe(500);
  });

  it('submits successfully, using the submitter profile name', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Jane Submitter' } }) }) }) };
      if (table === 'events') return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'e1', name: 'Muscle Car Show' }, error: null }) }) }) };
      return {};
    });
    const res: any = await eventsSubmitPost(makeRequest(validEvent));
    expect(res._status).toBe(200);
    expect(res._data.eventId).toBe('e1');
  });
});

// ── POST /api/facebook/post-listing ─────────────────────────────────────────

describe('POST /api/facebook/post-listing', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await postListingPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(429);
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await postListingPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(401);
  });

  it('returns 400 when carId is missing', async () => {
    const res: any = await postListingPost(makeRequest({}));
    expect(res._status).toBe(400);
  });

  it('returns 404 when the listing is not owned by the caller', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'other-user' } }) }) }) });
    const res: any = await postListingPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(404);
  });

  it('posts to Facebook fire-and-forget on success', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'user-1', title: 'Nice Car' } }) }) }) });
    const res: any = await postListingPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(200);
    expect(mockPostListingToFacebook).toHaveBeenCalledOnce();
  });

  it('records fb_posted_at once the fire-and-forget Facebook post succeeds', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', seller_id: 'user-1', title: 'Nice Car' } }) }) }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        };
      }
      return {};
    });
    mockPostListingToFacebook.mockResolvedValueOnce(true);
    const res: any = await postListingPost(makeRequest({ carId: 'c1' }));
    expect(res._status).toBe(200);
    await new Promise(process.nextTick);
    expect(updateEq).toHaveBeenCalledWith('id', 'c1');
  });
});

// ── POST /api/feedback ───────────────────────────────────────────────────────

describe('POST /api/feedback', () => {
  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, firstBlock: false });
    const res: any = await feedbackPost(makeRequest({ category: 'bug', message: 'Something is broken here' }));
    expect(res._status).toBe(429);
  });

  it('returns 400 for an invalid category', async () => {
    const res: any = await feedbackPost(makeRequest({ category: 'bogus', message: 'Something is broken here' }));
    expect(res._status).toBe(400);
  });

  it('returns 400 for a too-short message', async () => {
    const res: any = await feedbackPost(makeRequest({ category: 'bug', message: 'short' }));
    expect(res._status).toBe(400);
  });

  it('sends with a reply-to when an email is provided', async () => {
    const res: any = await feedbackPost(makeRequest({ category: 'feature', message: 'Please add dark mode', email: 'user@x.com' }));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].replyTo).toBe('user@x.com');
  });

  it('sends anonymously when no email is provided', async () => {
    const res: any = await feedbackPost(makeRequest({ category: 'general', message: 'Great site overall!' }));
    expect(res._status).toBe(200);
    expect(mockSend.mock.calls[0][0].replyTo).toBeUndefined();
    expect(mockSend.mock.calls[0][0].html).toContain('Anonymous');
  });
});

// ── POST /api/listings/[id]/renew ────────────────────────────────────────────

describe('POST /api/listings/[id]/renew', () => {
  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await renewPost(makeRequest({}), makeParams('l1'));
    expect(res._status).toBe(401);
  });

  it('returns 403 when not the owner', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'l1', seller_id: 'other-user', status: 'approved', is_feed_managed: false } }) }) }) });
    const res: any = await renewPost(makeRequest({}), makeParams('l1'));
    expect(res._status).toBe(403);
  });

  it('returns 400 when the listing is not approved', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'l1', seller_id: 'user-1', status: 'pending', is_feed_managed: false } }) }) }) });
    const res: any = await renewPost(makeRequest({}), makeParams('l1'));
    expect(res._status).toBe(400);
  });

  it('returns 400 when the listing is feed-managed', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'l1', seller_id: 'user-1', status: 'approved', is_feed_managed: true } }) }) }) });
    const res: any = await renewPost(makeRequest({}), makeParams('l1'));
    expect(res._status).toBe(400);
  });

  it('returns 500 when the update fails', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'l1', seller_id: 'user-1', status: 'approved', is_feed_managed: false } }) }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
    }));
    const res: any = await renewPost(makeRequest({}), makeParams('l1'));
    expect(res._status).toBe(500);
  });

  it('extends the expiry on success', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'l1', seller_id: 'user-1', status: 'approved', is_feed_managed: false } }) }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }));
    const res: any = await renewPost(makeRequest({}), makeParams('l1'));
    expect(res._status).toBe(200);
    expect(res._data.ok).toBe(true);
    expect(res._data.expiresAt).toBeDefined();
  });
});
