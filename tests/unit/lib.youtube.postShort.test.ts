import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) }),
}));

import { postListingReelToYouTube } from '@/lib/youtube/postShort';

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

const VIDEO_URL = 'https://video.garagecherries.com/reels/listing-1.mp4';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  process.env.YOUTUBE_CLIENT_ID = 'client-id';
  process.env.YOUTUBE_CLIENT_SECRET = 'client-secret';
  process.env.YOUTUBE_REFRESH_TOKEN = 'refresh-token';
});

function mockSuccessfulUploadChain() {
  (fetch as any)
    // token refresh
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
    // download source video
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
    // init resumable session
    .mockResolvedValueOnce({ ok: true, headers: { get: () => 'https://upload.example.com/session-1' } })
    // upload bytes
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'yt-video-1' }) });
}

describe('postListingReelToYouTube', () => {
  it('skips and returns false when YouTube env vars are not configured', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns false when the token refresh fails', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({ error_description: 'invalid_grant' }) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false when fetching the source video fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false when the resumable session init fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, status: 400, headers: { get: () => null }, text: async () => 'bad request' });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false when the byte upload step fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'https://upload.example.com/session-1' } })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'server error' } }) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('uploads successfully and returns true, defaulting to public visibility', async () => {
    mockSuccessfulUploadChain();
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(true);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.status.privacyStatus).toBe('public');
    expect(body.snippet.title).toContain('1969 Dodge Dart');
    expect(body.snippet.categoryId).toBe('2');
  });

  it('respects an explicit privacyStatus override', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube(LISTING, VIDEO_URL, 'private');

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.status.privacyStatus).toBe('private');
  });

  it('includes make/model hashtags derived from the listing, alongside the generic ones', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube(LISTING, VIDEO_URL);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.snippet.description).toContain('#Shorts');
    expect(body.snippet.description).toContain('#ClassicCars');
    expect(body.snippet.description).toContain('#Dodge');
    expect(body.snippet.description).toContain('#DodgeDart');
  });

  it('sanitizes make/model names with spaces or punctuation into valid single-word hashtags', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, make: 'Alfa Romeo', model: "GTV-6" }, VIDEO_URL);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.snippet.description).toContain('#AlfaRomeo');
    expect(body.snippet.description).toContain('#AlfaRomeoGTV6');
    const hashtagLine = body.snippet.description.trim().split('\n').pop();
    for (const tag of hashtagLine.split(' ')) {
      expect(tag).toMatch(/^#\w+$/);
    }
  });

  it('includes a hobby_segment hashtag when present', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, hobby_segment: 'Muscle Car' }, VIDEO_URL);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.snippet.description).toContain('#MuscleCar');
  });

  it('omits a hobby_segment hashtag when not present', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube(LISTING, VIDEO_URL);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    // #Shorts #ClassicCars #Dodge #DodgeDart -- no hobby_segment tag since none was given
    const hashtagCount = (body.snippet.description.match(/#\w+/g) ?? []).length;
    expect(hashtagCount).toBe(4);
  });

  it('tags a Corvette as #SportsCar', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, make: 'Chevrolet', model: 'Corvette' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.snippet.description).toContain('#SportsCar');
  });

  it('tags a Pantera as #ExoticCar', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, make: 'De Tomaso', model: 'Pantera' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.snippet.description).toContain('#ExoticCar');
  });

  it('tags a plain Camaro as #MuscleCar', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, make: 'Chevrolet', model: 'Camaro' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.snippet.description).toContain('#MuscleCar');
  });

  it('prioritizes #SuperCar over #MuscleCar for a Challenger Hellcat, since Super Car is checked first', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, make: 'Dodge', model: 'Challenger SRT Hellcat' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.snippet.description).toContain('#SuperCar');
    expect(body.snippet.description).not.toContain('#MuscleCar');
  });

  it('adds no segment hashtag when the model matches none of the keyword lists', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, make: 'Buick', model: 'Roadmaster' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.snippet.description).not.toMatch(/#(SuperCar|ExoticCar|MuscleCar|SportsCar)\b/);
  });

  it('includes a body-style hashtag for styles worth tagging, like Convertible', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, body_style: 'Convertible' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.snippet.description).toContain('#Convertible');
  });

  it('omits a body-style hashtag for generic styles like Sedan/4-Door/SUV', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, body_style: 'Sedan' }, VIDEO_URL);
    const body = JSON.parse((fetch as any).mock.calls[2][1].body);
    expect(body.snippet.description).not.toContain('#Sedan');
  });

  it('includes the plain description in the video description when present', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({ ...LISTING, description: 'Numbers-matching, one owner since new.' }, VIDEO_URL);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.snippet.description).toContain('Numbers-matching, one owner since new.');
  });

  it('prefers description_paragraphs over the plain description when both are present', async () => {
    mockSuccessfulUploadChain();
    await postListingReelToYouTube({
      ...LISTING,
      description: 'plain version',
      description_paragraphs: ['Paragraph one.', 'Paragraph two.'],
    }, VIDEO_URL);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.snippet.description).toContain('Paragraph one.\n\nParagraph two.');
    expect(body.snippet.description).not.toContain('plain version');
  });

  it('truncates a very long description to stay well under YouTube\'s 5000-char limit', async () => {
    mockSuccessfulUploadChain();
    const longDescription = 'x'.repeat(4500);
    await postListingReelToYouTube({ ...LISTING, description: longDescription }, VIDEO_URL);

    const initCall = (fetch as any).mock.calls[2];
    const body = JSON.parse(initCall[1].body);
    expect(body.snippet.description.length).toBeLessThan(5000);
    expect(body.snippet.description).toContain('…');
  });

  it('returns false and does not throw if fetch itself throws', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('network down'));
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('returns false and does not throw when a non-Error value is thrown', async () => {
    (fetch as any).mockRejectedValueOnce('network down');
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('still returns false cleanly if the failed init response body cannot be read', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, status: 400, headers: { get: () => null }, text: () => Promise.reject(new Error('stream error')) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('falls back to an HTTP-status error when the failed init response body is empty', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, status: 400, headers: { get: () => null }, text: async () => '' });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });

  it('falls back to an HTTP-status error when the failed upload response has no error message', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'https://upload.example.com/session-1' } })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe(false);
  });
});
