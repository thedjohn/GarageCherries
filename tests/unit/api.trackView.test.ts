import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockInsert } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockInsert: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn(() => ({ from: mockFrom })) }));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })) },
}));

import { POST } from '@/app/api/track-view/route';
import { isBotUserAgent } from '@/lib/isBot';

const CHROME_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CUBOT_PHONE = 'Mozilla/5.0 (Linux; Android 12; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function makeReq(userAgent: string | null) {
  const headers: Record<string, string> = { 'x-forwarded-for': '1.2.3.4' };
  if (userAgent !== null) headers['user-agent'] = userAgent;
  return {
    json: async () => ({ listingId: 'listing-1', dealerId: 'dealer-1' }),
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  mockFrom.mockImplementation(() => ({
    select: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) }),
    insert: mockInsert,
  }));
});

describe('isBotUserAgent', () => {
  it('lets real browsers through', () => {
    expect(isBotUserAgent(CHROME_DESKTOP)).toBe(false);
    expect(isBotUserAgent(IPHONE_SAFARI)).toBe(false);
  });

  it('does not flag phones whose brand name contains "bot"', () => {
    expect(isBotUserAgent(CUBOT_PHONE)).toBe(false);
  });

  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 Chrome-Lighthouse',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'python-requests/2.32.3',
    'curl/8.7.1',
  ])('flags %s', (ua) => {
    expect(isBotUserAgent(ua)).toBe(true);
  });

  it('treats a missing or blank User-Agent as a bot', () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent('   ')).toBe(true);
  });
});

describe('POST /api/track-view', () => {
  it('records a view from a real browser', async () => {
    const res: any = await POST(makeReq(IPHONE_SAFARI));
    expect(res._data).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ listing_id: 'listing-1', dealer_id: 'dealer-1' }));
  });

  it('skips the view for a bot without touching the database', async () => {
    const res: any = await POST(makeReq('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'));
    expect(res._data).toEqual({ ok: true, skipped: 'bot' });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('skips the view when no User-Agent is sent', async () => {
    await POST(makeReq(null));
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
