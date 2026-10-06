import { describe, it, expect, vi } from 'vitest';
import type { Car } from '@/lib/types';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }));

import { detectEventTheme, pickListings, getEventListings, PAST_EVENT_HEADING } from '@/lib/eventListings';
import { STATE_NEIGHBORS } from '@/lib/stateNeighbors';

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
const inState = (id: string, state: string) => car(id, { state });

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

describe('STATE_NEIGHBORS', () => {
  it('is symmetric -- every border is listed from both sides', () => {
    for (const [state, neighbors] of Object.entries(STATE_NEIGHBORS)) {
      for (const n of neighbors) expect(STATE_NEIGHBORS[n], `${n} should list ${state}`).toContain(state);
    }
  });

  it('covers all 50 states plus DC', () => {
    expect(Object.keys(STATE_NEIGHBORS)).toHaveLength(51);
  });
});

describe('pickListings', () => {
  const mopar = detectEventTheme('Mopar Nationals');
  const vette = detectEventTheme('Bricktown Corvette Show');

  it('uses only theme cars when there are enough, with a theme heading and link', () => {
    const block = pickListings(
      { theme: [car('t1'), car('t2')], state: [car('s1')], fallback: [car('f1')] },
      { theme: mopar, state: 'IL', max: 4 },
    )!;
    expect(block.match).toBe('theme');
    expect(block.heading).toBe('Mopars for sale');
    expect(block.browseHref).toBe('/listings?make=Dodge,Plymouth,Chrysler,DeSoto');
    // Never padded with non-theme cars.
    expect(block.cars.map(c => c.id)).toEqual(['t1', 't2']);
  });

  it('sorts theme cars by distance: same state, then neighbors, then anywhere', () => {
    const block = pickListings(
      { theme: [inState('pa', 'PA'), inState('ca', 'CA'), inState('tx', 'TX'), inState('ok', 'OK'), inState('in', 'IN')], fallback: [] },
      { theme: vette, state: 'OK', max: 4 },
    )!;
    expect(block.cars.map(c => c.id)).toEqual(['ok', 'tx', 'pa', 'ca']);
  });

  it('skips a theme with only one car and moves on to local cars', () => {
    const block = pickListings(
      { theme: [car('t1')], state: [car('s1'), car('s2')], fallback: [] },
      { theme: mopar, state: 'IL' },
    )!;
    expect(block.match).toBe('local');
  });

  it('shows in-state cars under an in-state heading', () => {
    const block = pickListings(
      { state: [inState('s1', 'NY'), inState('s2', 'NY'), inState('s3', 'NY'), inState('s4', 'NY')], nearby: [inState('n1', 'NJ')], fallback: [] },
      { state: 'NY', max: 4 },
    )!;
    expect(block.heading).toBe('Cars for sale in New York');
    expect(block.browseHref).toBe('/listings?state=NY');
  });

  it('fills from neighboring states (not nationwide) and says "in and near"', () => {
    const block = pickListings(
      { state: [inState('s1', 'NY'), inState('s2', 'NY'), inState('s3', 'NY')], nearby: [inState('n1', 'NJ')], fallback: [inState('mo', 'MO')] },
      { state: 'NY', max: 4 },
    )!;
    expect(block.cars.map(c => c.id)).toEqual(['s1', 's2', 's3', 'n1']);
    expect(block.heading).toBe('Cars for sale in and near New York');
    expect(block.cars.some(c => c.state === 'MO')).toBe(false);
  });

  it('shows fewer cards rather than padding a local block with far-away cars', () => {
    const block = pickListings(
      { state: [inState('s1', 'NY'), inState('s2', 'NY'), inState('s3', 'NY')], nearby: [], fallback: [inState('mo', 'MO')] },
      { state: 'NY', max: 4 },
    )!;
    expect(block.cars.map(c => c.id)).toEqual(['s1', 's2', 's3']);
  });

  it('says "near" when only neighboring states have cars, linking to all listings', () => {
    const block = pickListings(
      { state: [], nearby: [inState('n1', 'NH'), inState('n2', 'MA')], fallback: [] },
      { state: 'VT' },
    )!;
    expect(block.heading).toBe('Cars for sale near Vermont');
    expect(block.browseHref).toBe('/listings');
  });

  it('ignores nearby rows that are not actually neighbors', () => {
    const block = pickListings(
      { state: [], nearby: [inState('x', 'CA'), inState('y', 'TX')], fallback: [car('f1')] },
      { state: 'VT' },
    )!;
    expect(block.match).toBe('fallback');
  });

  it('falls back to featured/newest only when local cars are too few', () => {
    const block = pickListings(
      { state: [inState('s1', 'WY')], nearby: [], fallback: [car('f1'), car('f2')] },
      { theme: null, state: 'WY', max: 4 },
    )!;
    expect(block.match).toBe('fallback');
    expect(block.heading).toBe('Featured cars for sale');
    expect(block.browseHref).toBe('/listings');
    expect(block.cars.map(c => c.id)).toEqual(['f1', 'f2']);
  });

  it('never returns an empty block -- null when every pool is empty', () => {
    expect(pickListings({ theme: [], state: [], nearby: [], fallback: [] }, { theme: mopar, state: 'IL' })).toBeNull();
  });

  it('caps at max and skips duplicates', () => {
    const block = pickListings(
      { state: [inState('a', 'IL'), inState('a', 'IL'), inState('b', 'IL')], nearby: [inState('b', 'IN'), inState('c', 'IN'), inState('d', 'WI'), inState('e', 'IA')], fallback: [] },
      { state: 'IL', max: 4 },
    )!;
    expect(block.cars.map(c => c.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skips listings without a photo', () => {
    const block = pickListings(
      { state: [car('nophoto', { images: [] }), car('s1'), car('s2')], fallback: [] },
      { state: 'IL' },
    )!;
    expect(block.cars.map(c => c.id)).toEqual(['s1', 's2']);
  });

  it('uses the past-event heading but keeps the matched link', () => {
    const block = pickListings({ state: [car('s1'), car('s2')], fallback: [] }, { state: 'IL', isPast: true })!;
    expect(block.heading).toBe(PAST_EVENT_HEADING);
    expect(block.browseHref).toBe('/listings?state=IL');
  });

  it('ignores the theme pool when there is no theme', () => {
    const block = pickListings({ theme: [car('t1'), car('t2')], state: [car('s1'), car('s2')], fallback: [] }, { theme: null, state: 'IL' })!;
    expect(block.cars.map(c => c.id)).toEqual(['s1', 's2']);
  });
});

describe('getEventListings', () => {
  // Minimal chainable stand-in for the Supabase query builder: each query
  // records its filters and resolves to rows chosen by what it filtered on.
  function makeSupabase(rows: { theme?: any[]; state?: any[]; nearby?: any[]; fallback?: any[] }) {
    const calls: Record<string, unknown[][]>[] = [];
    const from = vi.fn(() => {
      const filters: Record<string, unknown[][]> = {};
      calls.push(filters);
      const q: any = {};
      for (const m of ['select', 'eq', 'or', 'in', 'ilike', 'order', 'limit']) {
        q[m] = (...args: unknown[]) => { (filters[m] ??= []).push(args); return q; };
      }
      q.then = (resolve: (v: unknown) => void) => {
        const ins = filters.in ?? [];
        const eqs = filters.eq ?? [];
        const data = ins.some(a => a[0] === 'make') ? (rows.theme ?? [])
          : ins.some(a => a[0] === 'state') ? (rows.nearby ?? [])
          : eqs.some(a => a[0] === 'state') ? (rows.state ?? [])
          : (rows.fallback ?? []);
        resolve({ data });
      };
      return q;
    });
    return { client: { from }, calls };
  }
  const row = (id: string, extra: Record<string, unknown> = {}) => ({ id, slug: id, title: id, year: 1969, make: 'Dodge', model: 'Charger', price: 1, state: 'IL', images: [`https://x/${id}.jpg`], ...extra });

  it('only queries active, unsold, unexpired listings', async () => {
    const { client, calls } = makeSupabase({ state: [row('s1'), row('s2')] });
    await getEventListings(client, { theme: detectEventTheme('Mopar Show'), state: 'IL' });
    expect(calls.length).toBe(5);
    for (const filters of calls) {
      expect(filters.eq).toEqual(expect.arrayContaining([['status', 'approved'], ['is_sold', false]]));
      expect(String(filters.or[0][0])).toContain('expires_at.is.null');
    }
  });

  it('queries the theme near the event and nationwide, by make and model prefix', async () => {
    const { client, calls } = makeSupabase({ theme: [row('t1', { state: 'OK' }), row('t2', { state: 'PA' })] });
    const block = await getEventListings(client, { theme: detectEventTheme('Corvette Show'), state: 'OK' });
    const themeCalls = calls.filter(c => c.in?.some(a => a[0] === 'make'));
    expect(themeCalls).toHaveLength(2);
    for (const c of themeCalls) expect(c.ilike).toEqual([['model', 'Corvette%']]);
    expect(themeCalls.some(c => c.in.some(a => a[0] === 'state' && (a[1] as string[]).includes('TX')))).toBe(true);
    expect(block?.match).toBe('theme');
  });

  it('queries neighboring states for the local tier', async () => {
    const { client, calls } = makeSupabase({ nearby: [row('n1', { state: 'NH' }), row('n2', { state: 'MA' })] });
    const block = await getEventListings(client, { state: 'VT' });
    const nearbyCall = calls.find(c => c.in?.some(a => a[0] === 'state'))!;
    expect(nearbyCall.in[0][1]).toEqual(['MA', 'NH', 'NY']);
    expect(block?.heading).toBe('Cars for sale near Vermont');
  });

  it('falls back when there are no local listings', async () => {
    const { client } = makeSupabase({ fallback: [row('f1'), row('f2')] });
    const block = await getEventListings(client, { state: 'WY' });
    expect(block?.match).toBe('fallback');
    expect(block?.cars).toHaveLength(2);
  });
});
