import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureFirstTouch, trackEvent, inferNewsletterSource } from '@/lib/gtag';

function clearCookies() {
  document.cookie.split(';').forEach(c => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  });
}

beforeEach(() => {
  clearCookies();
  delete (window as any).gtag;
  window.history.pushState({}, '', '/');
});

describe('captureFirstTouch', () => {
  it('does nothing when the URL has no utm params', () => {
    window.history.pushState({}, '', '/listings');
    captureFirstTouch();
    expect(document.cookie).not.toContain('gc_first_touch');
  });

  it('captures utm params from the URL into a cookie', () => {
    window.history.pushState({}, '', '/listings?utm_source=facebook&utm_medium=social&utm_campaign=summer_sale');
    captureFirstTouch();
    expect(document.cookie).toContain('gc_first_touch');
    const match = document.cookie.match(/gc_first_touch=([^;]*)/);
    const stored = JSON.parse(decodeURIComponent(match![1]));
    expect(stored).toEqual({ utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'summer_sale', utm_content: undefined });
  });

  it('does not overwrite an already-captured first touch with a later visit', () => {
    window.history.pushState({}, '', '/?utm_source=facebook&utm_medium=social');
    captureFirstTouch();

    window.history.pushState({}, '', '/?utm_source=google&utm_medium=cpc');
    captureFirstTouch();

    const match = document.cookie.match(/gc_first_touch=([^;]*)/);
    const stored = JSON.parse(decodeURIComponent(match![1]));
    expect(stored.utm_source).toBe('facebook');
  });
});

describe('inferNewsletterSource', () => {
  it('returns organic_website when no first touch has been captured', () => {
    expect(inferNewsletterSource()).toBe('organic_website');
  });

  it('maps utm_source=ig to instagram (the live Instagram bio link\'s actual spelling)', () => {
    window.history.pushState({}, '', '/?utm_source=ig&utm_medium=social');
    captureFirstTouch();
    expect(inferNewsletterSource()).toBe('instagram');
  });

  it('maps utm_source=instagram to instagram too (an internal link\'s different spelling for the same channel)', () => {
    window.history.pushState({}, '', '/?utm_source=instagram&utm_medium=bio');
    captureFirstTouch();
    expect(inferNewsletterSource()).toBe('instagram');
  });

  it('maps utm_source=fb and utm_source=facebook to facebook', () => {
    window.history.pushState({}, '', '/?utm_source=fb&utm_medium=social');
    captureFirstTouch();
    expect(inferNewsletterSource()).toBe('facebook');
  });

  it('is case-insensitive', () => {
    window.history.pushState({}, '', '/?utm_source=IG&utm_medium=social');
    captureFirstTouch();
    expect(inferNewsletterSource()).toBe('instagram');
  });

  it('falls back to organic_website for an unrecognized utm_source', () => {
    window.history.pushState({}, '', '/?utm_source=google&utm_medium=cpc');
    captureFirstTouch();
    expect(inferNewsletterSource()).toBe('organic_website');
  });
});

describe('trackEvent', () => {
  it('does not throw when window.gtag is not defined (dev/preview)', () => {
    expect(() => trackEvent('contact_seller', { car_id: '123' })).not.toThrow();
  });

  it('calls window.gtag with the event name and params when gtag is present', () => {
    const mockGtag = vi.fn();
    (window as any).gtag = mockGtag;

    trackEvent('make_offer', { car_id: '123', amount: 5000 });

    expect(mockGtag).toHaveBeenCalledWith('event', 'make_offer', expect.objectContaining({ car_id: '123', amount: 5000 }));
  });

  it('merges captured first-touch campaign data into the event params', () => {
    window.history.pushState({}, '', '/?utm_source=facebook&utm_medium=social&utm_campaign=summer_sale');
    captureFirstTouch();

    const mockGtag = vi.fn();
    (window as any).gtag = mockGtag;

    trackEvent('newsletter_signup');

    expect(mockGtag).toHaveBeenCalledWith('event', 'newsletter_signup', expect.objectContaining({
      utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'summer_sale',
    }));
  });

  it('event-specific params are not clobbered by first-touch data', () => {
    window.history.pushState({}, '', '/?utm_source=facebook');
    captureFirstTouch();

    const mockGtag = vi.fn();
    (window as any).gtag = mockGtag;

    trackEvent('dealer_phone_click', { dealer_id: 'dealer-1' });

    const [, , params] = mockGtag.mock.calls[0];
    expect(params.dealer_id).toBe('dealer-1');
    expect(params.utm_source).toBe('facebook');
  });
});
