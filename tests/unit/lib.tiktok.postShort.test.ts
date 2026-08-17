import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWarn, mockError } = vi.hoisted(() => ({ mockWarn: vi.fn(), mockError: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: mockWarn, error: mockError, flush: vi.fn().mockResolvedValue(undefined) }),
}));

import { postListingReelToTikTok } from '@/lib/tiktok/postShort';

const LISTING = {
  id: 'listing-1',
  title: '1969 Dodge Dart',
  make: 'Dodge',
  model: 'Dart',
  year: 1969,
  price: 45000,
  slug: '1969-dodge-dart-123',
  mileage: 45801,
  condition: 'Good',
  location: 'Charlotte',
  state: 'NC',
};

const VIDEO_URL = 'https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-videos/listing-1.mp4';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  process.env.TIKTOK_CLIENT_KEY = 'client-key';
  process.env.TIKTOK_CLIENT_SECRET = 'client-secret';
  process.env.TIKTOK_REFRESH_TOKEN = 'refresh-token';
});

function mockSuccessfulPostChain() {
  (fetch as any)
    // token refresh
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
    // download source video
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
    // inbox/video/init
    .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { code: 'ok' }, data: { publish_id: 'pub-1', upload_url: 'https://upload.example.com/session-1' } }) })
    // upload PUT
    .mockResolvedValueOnce({ ok: true });
}

describe('postListingReelToTikTok', () => {
  it('skips and returns false when TikTok env vars are not configured', async () => {
    delete process.env.TIKTOK_CLIENT_KEY;
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns false when the token refresh fails', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({ error_description: 'invalid_grant' }) });
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false when fetching the source video fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false and warns (not errors) when the creator already has 5 pending drafts', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { code: 'spam_risk_too_many_pending_share', message: 'daily upload cap reached' } }) });
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
    expect(mockWarn).toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  it('returns false and errors when video/init fails for any other reason', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { code: 'internal_error', message: 'boom' } }) });
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
    expect(mockError).toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('returns false when video/init succeeds at the HTTP level but has no publish_id/upload_url', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { code: 'ok' }, data: {} }) });
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false when the byte upload step fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { code: 'ok' }, data: { publish_id: 'pub-1', upload_url: 'https://upload.example.com/session-1' } }) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('still returns false cleanly if the failed upload response body cannot be read', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { code: 'ok' }, data: { publish_id: 'pub-1', upload_url: 'https://upload.example.com/session-1' } }) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.reject(new Error('stream error')) });
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('posts successfully and returns true', async () => {
    mockSuccessfulPostChain();
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(true);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.post_info.title).toContain('1969 Dodge Dart');
    expect(body.post_info.privacy_level).toBeUndefined();
    expect(body.source_info.source).toBe('FILE_UPLOAD');
    expect(body.source_info.video_size).toBe(8);
    expect(body.source_info.total_chunk_count).toBe(1);

    const uploadCall = (fetch as any).mock.calls[3];
    expect(uploadCall[0]).toBe('https://upload.example.com/session-1');
    expect(uploadCall[1].method).toBe('PUT');
  });

  it('tags a Corvette as #SportsCar', async () => {
    mockSuccessfulPostChain();
    await postListingReelToTikTok({ ...LISTING, make: 'Chevrolet', model: 'Corvette' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.post_info.title).toContain('#SportsCar');
  });

  it('prioritizes #SuperCar over #MuscleCar for a Challenger Hellcat', async () => {
    mockSuccessfulPostChain();
    await postListingReelToTikTok({ ...LISTING, make: 'Dodge', model: 'Challenger SRT Hellcat' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.post_info.title).toContain('#SuperCar');
    expect(body.post_info.title).not.toContain('#MuscleCar');
  });

  it('includes a body-style hashtag for styles worth tagging, like Convertible', async () => {
    mockSuccessfulPostChain();
    await postListingReelToTikTok({ ...LISTING, body_style: 'Convertible' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.post_info.title).toContain('#Convertible');
  });

  it('omits a body-style hashtag for generic styles like Sedan', async () => {
    mockSuccessfulPostChain();
    await postListingReelToTikTok({ ...LISTING, body_style: 'Sedan' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.post_info.title).not.toContain('#Sedan');
  });

  it('includes the vehicle description in the caption when present', async () => {
    mockSuccessfulPostChain();
    await postListingReelToTikTok({ ...LISTING, description: 'Numbers-matching, one owner since new.' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.post_info.title).toContain('Numbers-matching, one owner since new.');
  });

  it('prefers description_paragraphs over the plain description when both are present', async () => {
    mockSuccessfulPostChain();
    await postListingReelToTikTok({
      ...LISTING,
      description: 'plain version',
      description_paragraphs: ['Paragraph one.', 'Paragraph two.'],
    }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.post_info.title).toContain('Paragraph one.\n\nParagraph two.');
    expect(body.post_info.title).not.toContain('plain version');
  });

  it('truncates a very long description to stay under TikTok\'s 2200-char caption limit', async () => {
    mockSuccessfulPostChain();
    const longDescription = 'x'.repeat(3000);
    await postListingReelToTikTok({ ...LISTING, description: longDescription }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.post_info.title.length).toBeLessThanOrEqual(2200);
    expect(body.post_info.title).toContain('…');
  });

  it('returns false and does not throw if fetch itself throws', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('network down'));
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false and does not throw when a non-Error value is thrown', async () => {
    (fetch as any).mockRejectedValueOnce('network down');
    const result = await postListingReelToTikTok(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });
});
