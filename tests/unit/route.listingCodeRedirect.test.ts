import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockMaybeSingle, mockEq, mockNeq } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockEq: vi.fn(),
  mockNeq: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({ select: () => ({ eq: mockEq.mockReturnValue({ neq: mockNeq.mockReturnValue({ maybeSingle: mockMaybeSingle }) }) }) }),
  })),
}));
vi.mock('next/server', () => ({
  NextResponse: { redirect: vi.fn((url: string, status: number) => ({ _url: url, _status: status })) },
}));

import { GET as codeGET } from '@/app/c/[code]/route';
import { GET as ytGET } from '@/app/yt/route';

const req = {} as NextRequest;
const params = (code: string) => ({ params: Promise.resolve({ code }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /c/[code]', () => {
  it('redirects a known code to its listing, tagged as YouTube code traffic', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'abc', make: 'Ford', model: 'Thunderbird', slug: '1960-ford-thunderbird' } });

    const res: any = await codeGET(req, params('gc-7kq4m'));

    expect(mockEq).toHaveBeenCalledWith('listing_code', '7KQ4M');
    expect(mockNeq).toHaveBeenCalledWith('status', 'rejected');
    expect(res._status).toBe(302);
    expect(res._url).toBe('https://www.garagecherries.com/listings/ford/thunderbird/abc/1960-ford-thunderbird?utm_source=youtube-code&utm_medium=shorts&utm_campaign=listing&utm_content=GC-7KQ4M');
  });

  it('sends an unknown code to a normal search instead of an error page', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });

    const res: any = await codeGET(req, params('GC-ZZZZZ'));

    expect(res._url).toBe('https://www.garagecherries.com/listings?q=GC-ZZZZZ');
  });

  it('sends input that cannot be a code to the listings page without a lookup', async () => {
    const res: any = await codeGET(req, params('not-a-code'));

    expect(mockEq).not.toHaveBeenCalled();
    expect(res._url).toBe('https://www.garagecherries.com/listings');
  });
});

describe('GET /yt', () => {
  it('redirects to the listings page tagged as YouTube profile traffic', () => {
    const res: any = ytGET();
    expect(res._url).toBe('https://www.garagecherries.com/listings?utm_source=youtube&utm_medium=profile');
    expect(res._status).toBe(302);
  });
});
