import { describe, it, expect, vi } from 'vitest';
import type { Car } from '@/lib/types';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }));

import { detectEventTheme, pickListings, getEventListings, PAST_EVENT_HEADING } from '@/lib/eventListings';

function car(id: string, overrides: Partial<Car> = {}): Car {
  return {
    id, slug: `car-${id}`, title: `Car ${id}`, year: 1970, make: 'Dodge', model: 'Charger',
    price: 50000, mileage: 1000, location: 'Springfield', state: 'IL', condition: null,
    bodyStyle: 'Coupe', transmission: 'Manual', engine: null, color: null,
    images: [`https://example.com/${id}.jpg`], description: '', sellerId: '', sellerName: '',
    sellerPhone: '', featured: false, listedAt: '',
    ...overrides,
  };
}

describe('detectEventTheme', () => {
  it('detects make-specific shows from the event name', () => {
    expect(detectEventTheme('Mopars at the Strip')?.makes).toEqual(['Dodge', 'Plymouth', 'Chrysler', 'DeSoto']);
    expect(detectEventTheme('Pontiac Nationals')?.makes).toEqual(['Pontiac']);
    expect(detectEventTheme('Bloomington Gold Corvettes')).toMatchObject({ makes: ['Chevrolet'], model: 'Corvette' });
  });

  it('prefers the model-level theme over its make', () => {
    expect(detectEventTheme('Ford Mustang Roundup')?.model).toBe('Mustang');
    expect(detectEventTheme('Chevy Camaro Fest')?.model).toBe('Camaro');
  });

  it('returns null for general shows', () => {
    expect(detectEventTheme('Main Street Cruise Night')).toBeNull();
    expect(detectEventTheme('Fall Swap Meet')).toBeNull();
  });

  it('does not match a make inside another word', () => {
    expect(detectEventTheme('Stratford Summer Classic')).toBeNull();
    expect(detectEventTheme('Revette Park Show')).toBeNull();
  });
});

describe('pickListings', () => {
  const mopar = detectEventTheme('Mopar Nationals');

  it('uses theme matches first, with a theme heading and link', () => {
    const block = pickListings(
      { theme: [car('t1'), car('t2')], state: [car('s1')], fallback: [car('f1')] },
      { theme: mopar, state: 'IL', max: 4 },
    )!;
    expect(block.match).toBe('theme');
    expect(block.heading).toBe('Mopars for sale');
    expect(block.browseHref).toBe('/listings?q=Mopar');
    expect(block.cars.map(c => c.id)).toEqual(['t1', 't2', 's1', 'f1']);
  });

  it('falls back to same-state listings when no theme matches', () => {
    const block = pickListings(
      { theme: [], state: [car('s1'), car('s2')], fallback: [car('f1')] },
      { theme: mopar, state: 'IL', max: 4 },
    )!;
    expect(block.match).toBe('state');
    expect(block.heading).toBe('Cars for sale in Illinois');
    expect(block.browseHref).toBe('/listings?state=IL');
  });

  it('falls back to featured/newest when there are no theme or state matches', () => {
    const block = pickListings(
      { theme: [], state: [], fallback: [car('f1'), car('f2')] },
      { theme: null, state: 'WY', max: 4 },
    )!;
    expect(block.match).toBe('fallback');
    expect(block.heading).toBe('Featured cars for sale');
    expect(block.browseHref).toBe('/listings');
    expect(block.cars).toHaveLength(2);
  });

  it('never returns an empty block -- null when every pool is empty', () => {
    expect(pickListings({ theme: [], state: [], fallback: [] }, { theme: mopar, state: 'IL' })).toBeNull();
  });

  it('caps at max and skips duplicates across pools', () => {
    const block = pickListings(
      { theme: [car('a'), car('b')], state: [car('a'), car('c'), car('d')], fallback: [car('b'), car('e'), car('f'), car('g')] },
      { theme: mopar, state: 'IL', max: 6 },
    )!;
    expect(block.cars.map(c => c.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('skips listings without a photo', () => {
    const block = pickListings(
      { state: [car('nophoto', { images: [] }), car('s1')], fallback: [] },
      { state: 'IL' },
    )!;
    expect(block.cars.map(c => c.id)).toEqual(['s1']);
  });

  it('uses the past-event heading but keeps the matched link', () => {
    const block = pickListings({ state: [car('s1')], fallback: [] }, { state: 'IL', isPast: true })!;
    expect(block.heading).toBe(PAST_EVENT_HEADING);
    expect(block.browseHref).toBe('/listings?state=IL');
  });

  it('ignores the theme pool when there is no theme', () => {
    const block = pickListings({ theme: [car('t1')], state: [car('s1')], fallback: [] }, { theme: null, state: 'IL' })!;
    expect(block.cars.map(c => c.id)).toEqual(['s1']);
  });
});

describe('getEventListings', () => {
  // Minimal chainable stand-in for the Supabase query builder: each query
  // records its filters and resolves to rows chosen by what it filtered on.
  function makeSupabase(rows: { theme: any[]; state: any[]; fallback: any[] }) {
    const calls: Record<string, unknown[]>[] = [];
    const from = vi.fn(() => {
      const filters: Record<string, unknown[]> = {};
      calls.push(filters);
      const q: any = {};
      for (const m of ['select', 'eq', 'or', 'in', 'ilike', 'order', 'limit']) {
        q[m] = (...args: unknown[]) => { (filters[m] ??= []).push(args); return q; };
      }
      q.then = (resolve: (v: unknown) => void) => {
        const eqs = (filters.eq ?? []) as unknown[][];
        const data = filters.in ? rows.theme : eqs.some(a => a[0] === 'state') ? rows.state : rows.fallback;
        resolve({ data });
      };
      return q;
    });
    return { client: { from }, calls };
  }
  const row = (id: string, extra: Record<string, unknown> = {}) => ({ id, slug: id, title: id, year: 1969, make: 'Dodge', model: 'Charger', price: 1, images: [`https://x/${id}.jpg`], ...extra });

  it('only queries active, unsold, unexpired listings', async () => {
    const { client, calls } = makeSupabase({ theme: [], state: [row('s1')], fallback: [] });
    await getEventListings(client, { state: 'IL' });
    for (const filters of calls) {
      expect(filters.eq).toEqual(expect.arrayContaining([['status', 'approved'], ['is_sold', false]]));
      expect(String((filters.or as unknown[][])[0][0])).toContain('expires_at.is.null');
    }
  });

  it('filters the theme query by make and model prefix', async () => {
    const { client, calls } = makeSupabase({ theme: [row('t1')], state: [], fallback: [] });
    const block = await getEventListings(client, { theme: detectEventTheme('Corvette Show'), state: 'IL' });
    const themeCall = calls.find(c => c.in)!;
    expect(themeCall.in).toEqual([['make', ['Chevrolet']]]);
    expect(themeCall.ilike).toEqual([['model', 'Corvette%']]);
    expect(block?.match).toBe('theme');
  });

  it('falls back when the state has no listings', async () => {
    const { client } = makeSupabase({ theme: [], state: [], fallback: [row('f1'), row('f2')] });
    const block = await getEventListings(client, { state: 'WY' });
    expect(block?.match).toBe('fallback');
    expect(block?.cars).toHaveLength(2);
  });
});
