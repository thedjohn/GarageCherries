import { describe, it, expect } from 'vitest';
import { getBodyStyleContent, getBodyStyleSlugs, BODY_STYLES_CONTENT } from '@/lib/bodyStyles';

describe('getBodyStyleContent', () => {
  it('returns a known body style by slug', () => {
    const content = getBodyStyleContent('convertibles');
    expect(content).not.toBeNull();
    expect(content!.slug).toBe('convertibles');
    expect(content!.label).toBe('Convertible');
  });

  it('returns coupes content', () => {
    const content = getBodyStyleContent('coupes');
    expect(content).not.toBeNull();
    expect(content!.label).toBe('Coupe');
  });

  it('returns pickup-trucks content', () => {
    const content = getBodyStyleContent('pickup-trucks');
    expect(content).not.toBeNull();
    expect(content!.label).toBe('Pickup Truck');
  });

  it('returns fastbacks content', () => {
    const content = getBodyStyleContent('fastbacks');
    expect(content).not.toBeNull();
    expect(content!.label).toBe('Fastback');
  });

  it('returns null for an unknown slug', () => {
    expect(getBodyStyleContent('hatchbacks')).toBeNull();
    expect(getBodyStyleContent('')).toBeNull();
  });
});

describe('getBodyStyleSlugs', () => {
  it('returns an array of strings matching BODY_STYLES_CONTENT', () => {
    const slugs = getBodyStyleSlugs();
    expect(Array.isArray(slugs)).toBe(true);
    expect(slugs.length).toBe(BODY_STYLES_CONTENT.length);
    expect(slugs).toContain('convertibles');
    expect(slugs).toContain('coupes');
    expect(slugs).toContain('pickup-trucks');
    expect(slugs).toContain('fastbacks');
  });

  it('returns unique values only', () => {
    const slugs = getBodyStyleSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('BODY_STYLES_CONTENT data integrity', () => {
  it('every entry has a non-empty history and tagline', () => {
    for (const style of BODY_STYLES_CONTENT) {
      expect(style.history.length).toBeGreaterThan(0);
      expect(style.tagline.length).toBeGreaterThan(0);
    }
  });

  it('every entry has at least one notable model and buying tip', () => {
    for (const style of BODY_STYLES_CONTENT) {
      expect(style.notableModels.length).toBeGreaterThan(0);
      expect(style.buyingTips.length).toBeGreaterThan(0);
    }
  });

  it('every notable model has a name, years, and blurb', () => {
    for (const style of BODY_STYLES_CONTENT) {
      for (const model of style.notableModels) {
        expect(model.name.length).toBeGreaterThan(0);
        expect(model.years.length).toBeGreaterThan(0);
        expect(model.blurb.length).toBeGreaterThan(0);
      }
    }
  });
});
