import { describe, it, expect } from 'vitest';
import { getPriceTierContent, getPriceTierSlugs, PRICE_TIERS_CONTENT } from '@/lib/priceTiers';

describe('getPriceTierContent', () => {
  it('returns the under-10k tier', () => {
    const content = getPriceTierContent('under-10k');
    expect(content).not.toBeNull();
    expect(content!.min).toBe(0);
    expect(content!.max).toBe(10000);
  });

  it('returns the open-ended top tier', () => {
    const content = getPriceTierContent('50k-plus');
    expect(content).not.toBeNull();
    expect(content!.min).toBe(50000);
    expect(content!.max).toBeNull();
  });

  it('returns null for an unknown slug', () => {
    expect(getPriceTierContent('100k-plus')).toBeNull();
    expect(getPriceTierContent('')).toBeNull();
  });
});

describe('getPriceTierSlugs', () => {
  it('returns all 4 tiers in ascending order', () => {
    const slugs = getPriceTierSlugs();
    expect(slugs).toEqual(['under-10k', '10k-to-25k', '25k-to-50k', '50k-plus']);
  });

  it('returns unique values only', () => {
    const slugs = getPriceTierSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('PRICE_TIERS_CONTENT data integrity', () => {
  it('every tier has a non-empty overview, tagline, and label', () => {
    for (const tier of PRICE_TIERS_CONTENT) {
      expect(tier.overview.length).toBeGreaterThan(0);
      expect(tier.tagline.length).toBeGreaterThan(0);
      expect(tier.label.length).toBeGreaterThan(0);
    }
  });

  it('every tier has at least one buying tip', () => {
    for (const tier of PRICE_TIERS_CONTENT) {
      expect(tier.buyingTips.length).toBeGreaterThan(0);
    }
  });

  it('tiers are contiguous with no gaps or overlaps', () => {
    for (let i = 1; i < PRICE_TIERS_CONTENT.length; i++) {
      expect(PRICE_TIERS_CONTENT[i].min).toBe(PRICE_TIERS_CONTENT[i - 1].max);
    }
  });

  it('only the last tier is open-ended', () => {
    PRICE_TIERS_CONTENT.slice(0, -1).forEach(tier => {
      expect(tier.max).not.toBeNull();
    });
    expect(PRICE_TIERS_CONTENT[PRICE_TIERS_CONTENT.length - 1].max).toBeNull();
  });
});
