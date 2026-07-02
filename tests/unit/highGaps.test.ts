import { describe, it, expect } from 'vitest';

// H1+H2 — Dealer delete with cleanup
describe('dealer listing delete logic', () => {
  function extractStoragePaths(images: string[]): string[] {
    return images
      .map(url => url.split('/listing-images/')[1])
      .filter(Boolean);
  }

  it('extracts storage paths from public URLs', () => {
    const images = [
      'https://xyz.supabase.co/storage/v1/object/public/listing-images/photo1.jpg',
      'https://xyz.supabase.co/storage/v1/object/public/listing-images/photo2.jpg',
    ];
    expect(extractStoragePaths(images)).toEqual(['photo1.jpg', 'photo2.jpg']);
  });

  it('filters out malformed URLs that have no path segment', () => {
    const images = ['https://example.com/not-a-listing-image.jpg', ''];
    expect(extractStoragePaths(images)).toHaveLength(0);
  });

  it('handles empty images array', () => {
    expect(extractStoragePaths([])).toHaveLength(0);
  });

  it('handles mixed valid and invalid URLs', () => {
    const images = [
      'https://xyz.supabase.co/storage/v1/object/public/listing-images/good.jpg',
      'https://example.com/bad.jpg',
    ];
    expect(extractStoragePaths(images)).toEqual(['good.jpg']);
  });
});

// H3 — Price drop notification trigger
describe('price drop notification logic', () => {
  function shouldNotifyWatchers(oldPrice: number, newPrice: number): boolean {
    return newPrice > 0 && newPrice < oldPrice;
  }

  it('triggers notification when price drops', () => {
    expect(shouldNotifyWatchers(50000, 45000)).toBe(true);
  });

  it('does not trigger when price increases', () => {
    expect(shouldNotifyWatchers(45000, 50000)).toBe(false);
  });

  it('does not trigger when price is unchanged', () => {
    expect(shouldNotifyWatchers(45000, 45000)).toBe(false);
  });

  it('does not trigger when new price is zero', () => {
    expect(shouldNotifyWatchers(45000, 0)).toBe(false);
  });
});

// H4 — Car sold notification
describe('car sold watchlist notification', () => {
  function buildSoldEmailSubject(title: string): string {
    return `${title} has sold`;
  }

  it('builds correct subject line', () => {
    expect(buildSoldEmailSubject('1969 Chevrolet Camaro')).toBe('1969 Chevrolet Camaro has sold');
  });

  it('filters users without email addresses', () => {
    const users = [
      { id: '1', email: 'buyer@example.com' },
      { id: '2', email: null },
      { id: '3', email: 'another@example.com' },
    ];
    const watcherIds = ['1', '2', '3'];
    const emails = users
      .filter(u => watcherIds.includes(u.id) && u.email)
      .map(u => u.email!);
    expect(emails).toEqual(['buyer@example.com', 'another@example.com']);
  });

  it('returns empty email list when no watchers have emails', () => {
    const users = [{ id: '1', email: null }];
    const emails = users.filter(u => u.email).map(u => u.email!);
    expect(emails).toHaveLength(0);
  });
});
