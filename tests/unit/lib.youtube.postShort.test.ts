import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWarn, mockError } = vi.hoisted(() => ({ mockWarn: vi.fn(), mockError: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: mockWarn, error: mockError, flush: vi.fn().mockResolvedValue(undefined) }),
}));

import { postListingReelToYouTube, deleteYouTubeVideo, buildYouTubeTitle, buildYouTubeDescription, validateYouTubeUpload, formatListingCode } from '@/lib/youtube/postShort';

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
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns false when the token refresh fails', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({ error_description: 'invalid_grant' }) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
  });

  it('returns false when fetching the source video fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
  });

  it('returns false when the resumable session init fails for a genuine (non-quota) reason, still erroring normally', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, status: 400, headers: { get: () => null }, text: async () => 'bad request' });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
    expect(mockError).toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('returns false when the resumable session init fails due to the daily upload cap, warning (not erroring) since this is expected while the quota increase is pending', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({
        ok: false, status: 400, headers: { get: () => null },
        text: async () => JSON.stringify({ error: { code: 400, message: 'The user has exceeded the number of videos they may upload.', errors: [{ message: 'The user has exceeded the number of videos they may upload.', domain: 'youtube.video', reason: 'uploadLimitExceeded' }] } }),
      });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  it('returns false when the byte upload step fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'https://upload.example.com/session-1' } })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'server error' } }) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
  });

  it('uploads successfully and returns the video ID, defaulting to public visibility', async () => {
    mockSuccessfulUploadChain();
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBe('yt-video-1');

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
    expect(result).toBeNull();
  });

  it('returns false and does not throw when a non-Error value is thrown', async () => {
    (fetch as any).mockRejectedValueOnce('network down');
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
  });

  it('still returns false cleanly if the failed init response body cannot be read', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, status: 400, headers: { get: () => null }, text: () => Promise.reject(new Error('stream error')) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
  });

  it('falls back to an HTTP-status error when the failed init response body is empty', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: false, status: 400, headers: { get: () => null }, text: async () => '' });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
  });

  it('falls back to an HTTP-status error when the failed upload response has no error message', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'https://upload.example.com/session-1' } })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const result = await postListingReelToYouTube(LISTING, VIDEO_URL);
    expect(result).toBeNull();
  });
});

describe('deleteYouTubeVideo', () => {
  it('returns false when YouTube env vars are not configured, without calling fetch', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    const result = await deleteYouTubeVideo('yt-video-1');
    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refreshes the token, calls the delete endpoint with the video ID, and returns true on success', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await deleteYouTubeVideo('yt-video-1');

    expect(result).toBe(true);
    const [deleteUrl, deleteInit] = (fetch as any).mock.calls[1];
    expect(deleteUrl).toContain('yt-video-1');
    expect(deleteInit.method).toBe('DELETE');
    expect(deleteInit.headers.Authorization).toContain('access-token');
  });

  it('returns false and logs when the delete call fails', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'videoNotFound' });

    const result = await deleteYouTubeVideo('yt-video-1');

    expect(result).toBe(false);
    expect(mockError).toHaveBeenCalled();
  });

  it('catches a thrown fetch error without propagating it and returns false', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('network down'));
    const result = await deleteYouTubeVideo('yt-video-1');
    expect(result).toBe(false);
  });
});

describe('buildYouTubeTitle (hook titles)', () => {
  const base = { ...LISTING, mileage: null, description: null, body_style: null, location: null, state: null };

  it('leads with low mileage on a car new enough for a 6-digit odometer', () => {
    expect(buildYouTubeTitle({ ...base, year: 1990, title: '1990 Dodge Dart', mileage: 37000 })).toBe('Just 37,000 Miles: 1990 Dodge Dart for $45,000');
  });

  it('does not lead with mileage on an older car whose odometer may have rolled over', () => {
    expect(buildYouTubeTitle({ ...base, mileage: 27981 })).toBe('For Sale: 1969 Dodge Dart for $45,000');
  });

  it('leads with mileage on an older car when the seller says the miles are original', () => {
    expect(buildYouTubeTitle({ ...base, mileage: 37000, description: '37,000 original miles.' })).toBe('Just 37,000 Miles: 1969 Dodge Dart for $45,000');
  });

  it('always says "Not Running" first for a car that does not run, even with low miles', () => {
    expect(buildYouTubeTitle({ ...base, mileage: 20000, description: 'Barn find, does not run.' })).toBe('Not Running: 1969 Dodge Dart Project for $45,000');
  });

  it('uses seller-text hooks: numbers matching, frame-off, one owner', () => {
    expect(buildYouTubeTitle({ ...base, description: 'Numbers matching 340.' })).toBe('Numbers-Matching 1969 Dodge Dart for $45,000');
    expect(buildYouTubeTitle({ ...base, description: 'Rotisserie restoration in 2019.' })).toBe('Frame-Off Restored 1969 Dodge Dart for $45,000');
    expect(buildYouTubeTitle({ ...base, description: 'One owner since new.' })).toBe('One-Owner 1969 Dodge Dart for $45,000');
  });

  it('uses a convertible hook, without repeating "Convertible" already in the model', () => {
    expect(buildYouTubeTitle({ ...base, body_style: 'Convertible' })).toBe('Top-Down Ready: 1969 Dodge Dart Convertible for $45,000');
    expect(buildYouTubeTitle({ ...base, model: 'Dart Convertible', body_style: 'Convertible' })).toBe('For Sale: 1969 Dodge Dart Convertible for $45,000');
  });

  it('falls back to location, then a plain hook', () => {
    expect(buildYouTubeTitle({ ...base, location: 'Charlotte', state: 'NC' })).toBe('For Sale in Charlotte, NC: 1969 Dodge Dart for $45,000');
    expect(buildYouTubeTitle(base)).toBe('For Sale: 1969 Dodge Dart for $45,000');
  });

  it('stays under 100 characters and keeps year and make for long names', () => {
    const t = buildYouTubeTitle({ ...base, model: 'Dart Swinger 340 Special Edition Two-Door Hardtop With Very Long Trim Name Here', mileage: 12000 });
    expect(t.length).toBeLessThanOrEqual(100);
    expect(t).toContain('1969 Dodge');
  });

  it('keeps "Not Running" even when the hook is too long', () => {
    const t = buildYouTubeTitle({ ...base, model: 'X'.repeat(70), description: 'Non-running project.' });
    expect(t.startsWith('Not Running: ')).toBe(true);
    expect(t.length).toBeLessThanOrEqual(100);
  });
});

describe('buildYouTubeDescription', () => {
  const NOW = new Date('2026-10-09T12:00:00Z').getTime();
  const coded = { ...LISTING, listing_code: '7kq4m', description: 'Great driver. Call 618 336 5210 today.' };

  it('puts price, location, the search code and the promo line in the first three lines', () => {
    const lines = buildYouTubeDescription(coded, NOW).split('\n');
    expect(lines[0]).toBe('1969 Dodge Dart — $45,000 · Charlotte, NC');
    expect(lines[1]).toBe('See all photos and contact the seller: garagecherries.com — search code GC-7KQ4M');
    expect(lines[2]).toBe('Selling a car? List it free through Dec 31: garagecherries.com/sell');
  });

  it('drops the promo line after the promotion ends', () => {
    const d = buildYouTubeDescription(coded, new Date('2027-01-02T00:00:00Z').getTime());
    expect(d).not.toContain('List it free');
  });

  it('omits the code wording when the listing has no code yet', () => {
    expect(buildYouTubeDescription({ ...LISTING }, NOW).split('\n')[1]).toBe('See all photos and contact the seller: garagecherries.com');
  });

  it('cleans contact details out of the seller text', () => {
    const d = buildYouTubeDescription(coded, NOW);
    expect(d).toContain('Great driver.');
    expect(d).not.toContain('618 336 5210');
  });

  it('ends with a tracked full-listing link and hashtags', () => {
    const d = buildYouTubeDescription(coded, NOW);
    expect(d).toContain('Full listing: https://www.garagecherries.com/listings/dodge/dart/listing-1/1969-dodge-dart-123?utm_source=youtube&utm_medium=shorts&utm_campaign=listing&utm_content=GC-7KQ4M');
    expect(d.trim().split('\n').pop()).toMatch(/^#Shorts /);
  });

  it('never truncates the header or link, only the seller text, and stays under 5000 characters', () => {
    const d = buildYouTubeDescription({ ...coded, description: 'word '.repeat(2000) }, NOW);
    expect(d.length).toBeLessThan(5000);
    expect(d).toContain('search code GC-7KQ4M');
    expect(d).toContain('Full listing: https://www.garagecherries.com/');
    expect(d).toContain('…');
  });
});

describe('formatListingCode', () => {
  it('formats a stored code for display', () => {
    expect(formatListingCode('7kq4m')).toBe('GC-7KQ4M');
    expect(formatListingCode(null)).toBeNull();
  });
});

describe('validateYouTubeUpload', () => {
  it('passes a normal live listing', () => {
    expect(validateYouTubeUpload({ ...LISTING, status: 'approved', is_sold: false })).toBeNull();
  });

  it('blocks sold or non-live listings', () => {
    expect(validateYouTubeUpload({ ...LISTING, is_sold: true })).toMatch(/sold/);
    expect(validateYouTubeUpload({ ...LISTING, status: 'pending' })).toMatch(/no longer live/);
  });

  it('blocks a missing or zero price', () => {
    expect(validateYouTubeUpload({ ...LISTING, price: 0 })).toMatch(/Price/);
  });

  it('blocks when the listing title year disagrees with the year field', () => {
    expect(validateYouTubeUpload({ ...LISTING, title: '1975 Dodge Dart', year: 1976 })).toBe('Listing title says 1975 but the year field is 1976');
  });

  it('blocks when the seller text states a different model year', () => {
    expect(validateYouTubeUpload({ ...LISTING, title: 'Dodge Dart', description: 'This 1968 Dodge Dart is clean.' })).toBe('Seller text says 1968 Dodge but the year field is 1969');
  });

  it('does not flag years that are not followed by the make', () => {
    expect(validateYouTubeUpload({ ...LISTING, description: 'Repainted in 1985 and stored since 1999.' })).toBeNull();
  });
});

describe('postListingReelToYouTube — pre-upload checks', () => {
  it('does not upload, and warns, when the checks block the listing', async () => {
    const result = await postListingReelToYouTube({ ...LISTING, price: 0 }, VIDEO_URL);
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith('YouTube upload blocked by pre-upload checks', expect.objectContaining({ reason: 'Price is missing or zero' }));
  });
});
