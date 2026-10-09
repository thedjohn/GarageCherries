import { describe, it, expect } from 'vitest';
import { normalizeListingCode } from '@/lib/listingCode';

describe('normalizeListingCode', () => {
  it('accepts the GC- prefixed form in any case', () => {
    expect(normalizeListingCode('GC-7KQ4M')).toBe('7KQ4M');
    expect(normalizeListingCode('gc-7kq4m')).toBe('7KQ4M');
    expect(normalizeListingCode(' gc7kq4m ')).toBe('7KQ4M');
  });

  it('accepts a bare 5-character code', () => {
    expect(normalizeListingCode('7kq4m')).toBe('7KQ4M');
  });

  it('rejects ambiguous characters and wrong lengths', () => {
    expect(normalizeListingCode('GC-7KQ4O')).toBeNull(); // O
    expect(normalizeListingCode('GC-7KQ41')).toBeNull(); // 1
    expect(normalizeListingCode('GC-7KQ4I')).toBeNull(); // I
    expect(normalizeListingCode('GC-7KQ4L')).toBeNull(); // L
    expect(normalizeListingCode('GC-7KQ4')).toBeNull();
    expect(normalizeListingCode('camaro')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(normalizeListingCode(undefined)).toBeNull();
    expect(normalizeListingCode('')).toBeNull();
  });
});
