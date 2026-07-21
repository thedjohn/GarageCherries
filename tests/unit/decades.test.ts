import { describe, it, expect } from 'vitest';
import { getDecadeContent, getDecadeSlugs, getNotableModelsForDecade, DECADES_CONTENT } from '@/lib/decades';

describe('getDecadeContent', () => {
  it('returns a known decade by slug', () => {
    const content = getDecadeContent('1960s');
    expect(content).not.toBeNull();
    expect(content!.slug).toBe('1960s');
    expect(content!.startYear).toBe(1960);
    expect(content!.endYear).toBe(1969);
  });

  it('returns the open-ended-sounding but bounded 2010s decade', () => {
    const content = getDecadeContent('2010s');
    expect(content).not.toBeNull();
    expect(content!.startYear).toBe(2010);
    expect(content!.endYear).toBe(2019);
  });

  it('returns null for an unknown slug', () => {
    expect(getDecadeContent('2020s')).toBeNull();
    expect(getDecadeContent('')).toBeNull();
  });
});

describe('getDecadeSlugs', () => {
  it('returns all 9 decades from 1930s through 2010s', () => {
    const slugs = getDecadeSlugs();
    expect(slugs).toEqual([
      '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s',
    ]);
  });

  it('returns unique values only', () => {
    const slugs = getDecadeSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getNotableModelsForDecade', () => {
  it('returns entries whose year range overlaps the decade', () => {
    const decade = getDecadeContent('1960s')!;
    const models = getNotableModelsForDecade(decade);
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      const parts = m.years.split(/[–-]/).map(Number);
      const start = parts[0];
      const modelEnd = parts.length > 1 ? parts[1] : parts[0];
      expect(start).toBeLessThanOrEqual(decade.endYear);
      expect(modelEnd).toBeGreaterThanOrEqual(decade.startYear);
    }
  });

  it('respects the limit parameter', () => {
    const decade = getDecadeContent('1960s')!;
    const models = getNotableModelsForDecade(decade, 2);
    expect(models.length).toBeLessThanOrEqual(2);
  });

  it('handles single-year entries without a range', () => {
    // Should not throw on entries like years: '1969' (no dash)
    for (const decade of DECADES_CONTENT) {
      expect(() => getNotableModelsForDecade(decade)).not.toThrow();
    }
  });
});

describe('DECADES_CONTENT data integrity', () => {
  it('every decade has a non-empty history, tagline, and label', () => {
    for (const decade of DECADES_CONTENT) {
      expect(decade.history.length).toBeGreaterThan(0);
      expect(decade.tagline.length).toBeGreaterThan(0);
      expect(decade.label.length).toBeGreaterThan(0);
    }
  });

  it('every decade has at least one buying tip', () => {
    for (const decade of DECADES_CONTENT) {
      expect(decade.buyingTips.length).toBeGreaterThan(0);
    }
  });

  it('every decade spans exactly 10 years with no gaps between decades', () => {
    for (const decade of DECADES_CONTENT) {
      expect(decade.endYear - decade.startYear).toBe(9);
    }
    for (let i = 1; i < DECADES_CONTENT.length; i++) {
      expect(DECADES_CONTENT[i].startYear).toBe(DECADES_CONTENT[i - 1].endYear + 1);
    }
  });
});
