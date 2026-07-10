import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import {
  fetchCars, fetchCar, fetchDealer, fetchDealerById, fetchDealers,
  fetchModelsByMake, fetchMakes, fetchCarCount, resolveMake,
} from '@/lib/db';

// A chainable query-builder mock: every filter method returns `this`, and the
// object itself is awaitable (mimics Supabase's real query builder behavior).
function makeQueryBuilder(result: { data?: any; error?: any; count?: number }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchCars', () => {
  it('adapts raw rows into Car shape with defaults for missing fields', async () => {
    const builder = makeQueryBuilder({ data: [{ id: 'c1', slug: 'x', title: 'T', year: 1969, make: 'Dodge', model: 'Charger', condition: 'Good' }] });
    mockFrom.mockReturnValue(builder);
    const cars = await fetchCars();
    expect(cars).toHaveLength(1);
    expect(cars[0]).toMatchObject({ price: 0, mileage: 0, location: '', transmission: 'Automatic', images: [] });
  });

  it('returns an empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null }));
    expect(await fetchCars()).toEqual([]);
  });

  it('applies all optional filters and clamps year range to [1900, 2030]', async () => {
    const builder = makeQueryBuilder({ data: [] });
    mockFrom.mockReturnValue(builder);
    await fetchCars({
      make: 'Dodge', model: 'Charger', yearMin: 1800, yearMax: 2200,
      priceMin: 1000, priceMax: 50000, condition: 'Good', bodyStyle: 'Coupe',
      transmission: 'Manual', state: 'MO', featured: true, sellerId: 's1', limit: 10,
    });
    expect(builder.gte).toHaveBeenCalledWith('year', 1900);
    expect(builder.lte).toHaveBeenCalledWith('year', 2030);
    expect(builder.eq).toHaveBeenCalledWith('make', 'Dodge');
    expect(builder.eq).toHaveBeenCalledWith('model', 'Charger');
    expect(builder.eq).toHaveBeenCalledWith('featured', true);
    expect(builder.eq).toHaveBeenCalledWith('seller_id', 's1');
    expect(builder.limit).toHaveBeenCalledWith(10);
  });

  it('skips make/condition/bodyStyle/state filters when set to their "All" sentinel', async () => {
    const builder = makeQueryBuilder({ data: [] });
    mockFrom.mockReturnValue(builder);
    await fetchCars({ make: 'All Makes', condition: 'All', bodyStyle: 'All Styles', state: 'All States' });
    expect(builder.eq).not.toHaveBeenCalledWith('make', expect.anything());
    expect(builder.eq).not.toHaveBeenCalledWith('condition', expect.anything());
    expect(builder.eq).not.toHaveBeenCalledWith('body_style', expect.anything());
    expect(builder.eq).not.toHaveBeenCalledWith('state', expect.anything());
  });

  it('does not apply negative price filters', async () => {
    const builder = makeQueryBuilder({ data: [] });
    mockFrom.mockReturnValue(builder);
    await fetchCars({ priceMin: -5, priceMax: -5 });
    expect(builder.gte).not.toHaveBeenCalledWith('price', expect.anything());
    expect(builder.lte).not.toHaveBeenCalledWith('price', expect.anything());
  });
});

describe('fetchCar', () => {
  it('returns an adapted car when found', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: { id: 'c1', slug: 'x', title: 'T', year: 1969, make: 'Dodge', model: 'Charger', condition: 'Good' } }));
    const car = await fetchCar('c1');
    expect(car?.id).toBe('c1');
  });

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null }));
    expect(await fetchCar('missing')).toBeNull();
  });
});

describe('fetchDealer / fetchDealerById', () => {
  it('adapts a dealer row with defaults for missing optional fields', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: { id: 'd1', slug: 'x', name: 'Dealer Co' } }));
    const dealer = await fetchDealer('x');
    expect(dealer).toMatchObject({ phone: '', email: '', specialties: [], since: 0 });
  });

  it('returns null when the dealer slug does not exist', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null }));
    expect(await fetchDealer('missing')).toBeNull();
  });

  it('fetches a dealer by id', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: { id: 'd1', slug: 'x', name: 'Dealer Co' } }));
    expect((await fetchDealerById('d1'))?.name).toBe('Dealer Co');
  });

  it('returns null when the dealer id does not exist', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null }));
    expect(await fetchDealerById('missing')).toBeNull();
  });
});

describe('fetchDealers', () => {
  it('joins dealers with their listing counts', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dealers') return makeQueryBuilder({ data: [{ id: 'd1', slug: 'x', name: 'Dealer Co' }, { id: 'd2', slug: 'y', name: 'No Listings Co' }] });
      if (table === 'listings') return makeQueryBuilder({ data: [{ seller_id: 'd1' }, { seller_id: 'd1' }] });
      return makeQueryBuilder({ data: [] });
    });
    const dealers = await fetchDealers();
    expect(dealers.find(d => d.id === 'd1')?.listingCount).toBe(2);
    expect(dealers.find(d => d.id === 'd2')?.listingCount).toBe(0);
  });
});

describe('fetchModelsByMake', () => {
  it('returns unique, sorted model names', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [{ model: 'Charger' }, { model: 'Challenger' }, { model: 'Charger' }] }));
    expect(await fetchModelsByMake('Dodge')).toEqual(['Challenger', 'Charger']);
  });

  it('returns an empty array when there is no data', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null }));
    expect(await fetchModelsByMake('Dodge')).toEqual([]);
  });
});

describe('fetchMakes', () => {
  it('returns unique, sorted, non-empty make names', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [{ make: 'Ford' }, { make: 'Chevrolet' }, { make: '' }, { make: 'Ford' }] }));
    expect(await fetchMakes()).toEqual(['Chevrolet', 'Ford']);
  });
});

describe('fetchCarCount', () => {
  it('returns the count', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ count: 42 }));
    expect(await fetchCarCount()).toBe(42);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ count: undefined }));
    expect(await fetchCarCount()).toBe(0);
  });
});

describe('resolveMake', () => {
  it('resolves a URL segment to its properly-cased make', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [{ make: 'BMW' }, { make: 'Mercedes-Benz' }] }));
    expect(await resolveMake('mercedes-benz')).toBe('Mercedes-Benz');
  });

  it('returns null when no make matches the segment', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [{ make: 'BMW' }] }));
    expect(await resolveMake('not-a-real-make')).toBeNull();
  });
});
