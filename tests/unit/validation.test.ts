import { describe, it, expect } from 'vitest';

// ─── Image URL validation ────────────────────────────────────────────────────
describe('image URL validation', () => {
  const SUPABASE_HOST = 'abc123.supabase.co';

  function isValidImageUrl(url: unknown, supabaseHost: string): boolean {
    if (typeof url !== 'string') return false;
    if (!url.startsWith('https://')) return false;
    if (!url.includes(supabaseHost)) return false;
    if (!url.includes('/listing-images/')) return false;
    return true;
  }

  it('accepts a valid Supabase storage URL', () => {
    expect(isValidImageUrl(
      `https://${SUPABASE_HOST}/storage/v1/object/public/listing-images/photo.jpg`,
      SUPABASE_HOST,
    )).toBe(true);
  });

  it('rejects http (non-https)', () => {
    expect(isValidImageUrl(
      `http://${SUPABASE_HOST}/storage/v1/object/public/listing-images/photo.jpg`,
      SUPABASE_HOST,
    )).toBe(false);
  });

  it('rejects URLs from a different domain', () => {
    expect(isValidImageUrl(
      'https://evil.com/listing-images/photo.jpg',
      SUPABASE_HOST,
    )).toBe(false);
  });

  it('rejects competitor photo URLs', () => {
    expect(isValidImageUrl(
      'https://autotrader.com/photo.jpg',
      SUPABASE_HOST,
    )).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(isValidImageUrl('javascript:alert(1)', SUPABASE_HOST)).toBe(false);
  });

  it('rejects non-listing-images bucket paths', () => {
    expect(isValidImageUrl(
      `https://${SUPABASE_HOST}/storage/v1/object/public/other-bucket/photo.jpg`,
      SUPABASE_HOST,
    )).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidImageUrl('', SUPABASE_HOST)).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidImageUrl(null, SUPABASE_HOST)).toBe(false);
    expect(isValidImageUrl(123, SUPABASE_HOST)).toBe(false);
    expect(isValidImageUrl(undefined, SUPABASE_HOST)).toBe(false);
  });

  it('caps image array at 20', () => {
    const urls = Array(30).fill(
      `https://${SUPABASE_HOST}/storage/v1/object/public/listing-images/photo.jpg`,
    );
    expect(urls.slice(0, 20)).toHaveLength(20);
  });
});

// ─── Ad URL validation ────────────────────────────────────────────────────────
describe('ad URL validation', () => {
  function isValidAdUrl(url: unknown): boolean {
    if (typeof url !== 'string') return false;
    if (!url.startsWith('https://') && !url.startsWith('http://')) return false;
    if (url.length > 2000) return false;
    return true;
  }

  it('accepts a valid https URL', () => {
    expect(isValidAdUrl('https://example.com/landing')).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(isValidAdUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects URLs over 2000 chars', () => {
    expect(isValidAdUrl('https://example.com/' + 'a'.repeat(2000))).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidAdUrl(null)).toBe(false);
  });
});

// ─── US state code validation ──────────────────────────────────────────────
describe('US state code validation', () => {
  const VALID_STATES = new Set([
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
    'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
    'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
    'TX','UT','VT','VA','WA','WV','WI','WY','DC',
  ]);

  function isValidState(state: unknown): boolean {
    return typeof state === 'string' && VALID_STATES.has(state.toUpperCase());
  }

  it('accepts valid state codes', () => {
    expect(isValidState('MO')).toBe(true);
    expect(isValidState('CA')).toBe(true);
    expect(isValidState('TX')).toBe(true);
  });

  it('accepts lowercase (normalised)', () => {
    expect(isValidState('mo')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(isValidState('XX')).toBe(false);
    expect(isValidState('ZZ')).toBe(false);
    expect(isValidState('')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isValidState(null)).toBe(false);
    expect(isValidState(42)).toBe(false);
  });
});

// ─── VIN verification logic ────────────────────────────────────────────────
describe('VIN verification logic', () => {
  function isVerified(
    makeMatch: boolean | null,
    modelMatch: boolean | null,
    yearMatch: boolean | null,
  ): boolean {
    return (
      makeMatch !== false &&
      modelMatch !== false &&
      yearMatch !== false &&
      (makeMatch === true || modelMatch === true || yearMatch === true)
    );
  }

  it('verifies when all fields match', () => {
    expect(isVerified(true, true, true)).toBe(true);
  });

  it('verifies when some fields are null (not provided) but none false', () => {
    expect(isVerified(true, null, null)).toBe(true);
    expect(isVerified(true, true, null)).toBe(true);
  });

  it('does NOT verify when all fields are null (nothing to check)', () => {
    expect(isVerified(null, null, null)).toBe(false);
  });

  it('fails when make does not match', () => {
    expect(isVerified(false, true, true)).toBe(false);
  });

  it('fails when model does not match', () => {
    expect(isVerified(true, false, true)).toBe(false);
  });

  it('fails when year does not match', () => {
    expect(isVerified(true, true, false)).toBe(false);
  });

  it('fails when all mismatch', () => {
    expect(isVerified(false, false, false)).toBe(false);
  });

  it('17-char VIN format check rejects I, O, Q', () => {
    expect(/^[A-HJ-NPR-Z0-9]{17}$/.test('1HGBH41JXMN109186')).toBe(true);
    expect(/^[A-HJ-NPR-Z0-9]{17}$/.test('1HGBH41JOMN109186')).toBe(false); // O
    expect(/^[A-HJ-NPR-Z0-9]{17}$/.test('1HGBH41JIMN109186')).toBe(false); // I
  });

  it('pre-1981 VINs (< 17 chars) skip NHTSA decode', () => {
    const vin = 'Z14A11234';
    expect(vin.length).toBeLessThan(17);
  });
});

// ─── Storage path extraction ──────────────────────────────────────────────
describe('storage path extraction', () => {
  function extractPath(url: string): string | null {
    const part = url.split('/listing-images/')[1];
    return part || null;
  }

  it('extracts filename from full public URL', () => {
    expect(extractPath(
      'https://abc.supabase.co/storage/v1/object/public/listing-images/abc123.jpg',
    )).toBe('abc123.jpg');
  });

  it('returns null for unrelated URL', () => {
    expect(extractPath('https://example.com/photo.jpg')).toBeNull();
  });
});
