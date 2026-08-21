import { describe, it, expect } from 'vitest';
import { getListingsIntro, MAKE_INTROS } from '@/lib/listingsMakeContent';

describe('getListingsIntro', () => {
  it('returns the known intro copy for a make with an entry', () => {
    expect(getListingsIntro('porsche', 'Porsche')).toBe(MAKE_INTROS['porsche']);
    expect(getListingsIntro('porsche', 'Porsche')).toMatch(/911/);
  });

  it('falls back to generic copy for a make with no entry', () => {
    expect(getListingsIntro('yugo', 'Yugo')).toBe(
      'Browse Yugo classic cars for sale on GarageCherries — new listings added regularly.'
    );
  });
});
