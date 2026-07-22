import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockFrom, mockRpc, mockNotifyAdmin, mockLoggerInfo, mockLoggerWarn, mockLoggerFlush,
  mockPostToFacebook, mockSubmitToIndexNow,
} = vi.hoisted(() => ({
  mockFrom:             vi.fn(),
  mockRpc:              vi.fn(),
  mockNotifyAdmin:      vi.fn(),
  mockLoggerInfo:       vi.fn(),
  mockLoggerWarn:       vi.fn(),
  mockLoggerFlush:      vi.fn().mockResolvedValue(undefined),
  mockPostToFacebook:   vi.fn().mockResolvedValue(true),
  mockSubmitToIndexNow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: mockLoggerWarn, error: vi.fn(), flush: mockLoggerFlush }),
}));
vi.mock('@/lib/facebook/postToPage', () => ({ postListingToFacebook: mockPostToFacebook }));
vi.mock('@/lib/indexNow', () => ({ submitToIndexNow: mockSubmitToIndexNow }));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/cron/dealer-feed-sync/route';

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

const HEADER = [
  'Dealer Name', 'Dealer Phone Number', 'Dealer Email Address', 'Address 1', 'City', 'State', 'Zip', 'Country',
  'Stock Number', 'VIN', 'Year', 'Make', 'Model', 'Sub-Model', 'Condition', 'BodyStyle', 'List Price', 'Mileage',
  'Mileage Unit', 'Doors', 'Engine Size', 'Transmission', 'Factory Exterior Color', 'Factory Interior Color',
  'Basic Exterior Color', 'Baisc Interior Color', 'Default Header', 'Long Description', 'Images Urls', 'Youtube URL', 'VDP URL',
];

function csvRow(fields: Partial<Record<string, string>>) {
  return HEADER.map(h => `"${(fields[h] ?? '').replace(/"/g, '""')}"`).join(',');
}
function buildCsv(rows: Partial<Record<string, string>>[]) {
  return [HEADER.map(h => `"${h}"`).join(','), ...rows.map(csvRow)].join('\n');
}

const DEALER = { id: 'dealer-1', name: 'Survivor Classic Car Services', phone: '555-1234', email: 'info@survivor-cars.com', location: 'Tampa', state: 'FL' };

function makeSupabaseMock({ dealer, existingListings = [] as { id: string; vin: string }[], updateError = null as string | null }: {
  dealer: typeof DEALER | null;
  existingListings?: { id: string; vin: string | null; stock_number?: string | null }[];
  updateError?: string | null;
}) {
  const updateCalls: { id: string; payload: any }[] = [];
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: dealer }) }) }) };
    }
    if (table === 'listings') {
      return {
        select: () => ({ eq: () => Promise.resolve({ data: existingListings }) }),
        update: (payload: any) => ({
          eq: (_col: string, id: string) => {
            updateCalls.push({ id, payload });
            return Promise.resolve({ error: updateError ? new Error(updateError) : null });
          },
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { updateCalls };
}

const originalFetch = global.fetch;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret';
  process.env.SURVIVOR_FEED_URL = 'https://example.com/feed.csv';
  mockRpc.mockResolvedValue({ error: null });
});
afterEach(() => {
  global.fetch = originalFetch;
});

describe('GET /api/cron/dealer-feed-sync', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    const res: any = await GET(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('records an error and continues when no dealer account matches the feed email', async () => {
    makeSupabaseMock({ dealer: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => buildCsv([]) }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].errors[0]).toContain('No dealer account found');
  });

  it('records an error when the feed fetch fails', async () => {
    makeSupabaseMock({ dealer: DEALER });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].errors[0]).toContain('Could not fetch feed');
  });

  it('inserts a new vehicle not already in our listings, and fires Facebook/IndexNow', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{
      VIN: '1J4FY19P9SP307762', Year: '1995', Make: 'Jeep', Model: 'Wrangler', 'Sub-Model': '4x4',
      Condition: 'USED', BodyStyle: 'SUV', 'List Price': '12595', Mileage: '78495',
      Transmission: '5-Speed Manual', 'Engine Size': '2.5 Liter Inline 4-Cylinder',
      'Basic Exterior Color': 'Emerald Green Metallic', 'Long Description': 'Clean Jeep.',
      'Images Urls': 'https://example.com/1.jpg, https://example.com/2.jpg',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].inserted).toBe(1);
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
      p_vin: '1J4FY19P9SP307762',
      p_make: 'Jeep',
      p_model: 'Wrangler',
      p_body_style: 'SUV',
      p_transmission: 'Manual',
      p_condition: 'Good',
      p_seller_id: 'dealer-1',
      p_status: 'approved',
      p_images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    }));
    expect(mockPostToFacebook).toHaveBeenCalled();
    expect(mockSubmitToIndexNow).toHaveBeenCalled();
  });

  it("uses each row's own City/State/Dealer Phone/Dealer Email, not the dealer account's fields, for multi-location dealers", async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-CHICAGO', Year: '1969', Make: 'Chevrolet', Model: 'Camaro', BodyStyle: 'Coupe', 'List Price': '60000',
      City: 'Homer Glen', State: 'IL', 'Dealer Phone Number': '(708) 260-6220', 'Dealer Email Address': 'Nic@Survivor-Cars.com',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
      p_location: 'Homer Glen',
      p_state: 'IL',
      p_seller_phone: '(708) 260-6220',
      p_seller_email: 'Nic@Survivor-Cars.com',
      p_seller_name: DEALER.name, // seller name always comes from the dealer account, not the feed's location-label "Dealer Name" column
    }));
  });

  it('parses the "Dealer Name" location label (e.g. "Tampa, Florida") when City/State columns are blank', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-TAMPA', Year: '1995', Make: 'Jeep', Model: 'Wrangler', BodyStyle: 'SUV', 'List Price': '12595',
      'Dealer Name': 'Tampa, Florida', City: '', State: '',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
      p_location: 'Tampa',
      p_state: 'FL',
    }));
  });

  it('caps images at 30, evenly spread across the full set, when a row has more than 30', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const manyImages = Array.from({ length: 120 }, (_, i) => `https://example.com/${i}.jpg`).join(', ');
    const csv = buildCsv([{ VIN: 'VIN-MANY-PHOTOS', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000', 'Images Urls': manyImages }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    const call = mockRpc.mock.calls.find(c => c[1].p_vin === 'VIN-MANY-PHOTOS');
    expect(call![1].p_images).toHaveLength(30);
    // Evenly spread, not just the first 30 -- first and last selected should span close to the full range.
    expect(call![1].p_images[0]).toBe('https://example.com/0.jpg');
    expect(Number(call![1].p_images[29].match(/(\d+)\.jpg/)[1])).toBeGreaterThan(100);
  });

  it('imports a car with an unrecognized make anyway, flagging it instead of skipping it', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-OBSCURE', Year: '1990', Make: 'Wartburg', Model: '353', BodyStyle: 'Sedan', 'List Price': '9000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(true); // not a failure -- the car still imported
    expect(res._data.results['info@survivor-cars.com'].inserted).toBe(1);
    expect(res._data.results['info@survivor-cars.com'].unrecognizedMakes).toEqual(['Wartburg']);
    expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer feed sync found unrecognized makes', expect.stringContaining('Wartburg'));
  });

  it('does not flag a make already in MAKES', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-KNOWN-MAKE', Year: '1970', Make: 'Chevrolet', Model: 'Camaro', BodyStyle: 'Coupe', 'List Price': '40000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].unrecognizedMakes).toEqual([]);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it("falls back to the dealer account's own location/phone/email when a row leaves them blank", async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-BLANK', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '35000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
      p_location: DEALER.location,
      p_state: DEALER.state,
      p_seller_phone: DEALER.phone,
      p_seller_email: DEALER.email,
    }));
  });

  it('maps an automatic-transmission string correctly', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-AUTO', Year: '1970', Make: 'Chevrolet', Model: 'Chevelle', BodyStyle: 'Coupe',
      'List Price': '40000', Transmission: 'Turbo 400 Automatic',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_transmission: 'Automatic' }));
  });

  it('maps Hatchback to Coupe', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-HATCH', Year: '1979', Make: 'Datsun', Model: '280ZX', BodyStyle: 'Hatchback',
      'List Price': '15000', Transmission: 'Manual',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_body_style: 'Coupe' }));
  });

  it('skips motorcycle rows (cruiser/touring body styles) entirely', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([
      { VIN: 'VIN-MOTO-1', Year: '2016', Make: 'Harley Davidson', Model: 'FLD Switchback', BodyStyle: 'cruiser', 'List Price': '9000' },
      { VIN: 'VIN-MOTO-2', Year: '1988', Make: 'Harley Davidson', Model: 'FLHTC Electra Glide', BodyStyle: 'touring', 'List Price': '9000' },
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].skipped).toBe(2);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('updates an existing listing matched by VIN instead of inserting a duplicate', async () => {
    const { updateCalls } = makeSupabaseMock({
      dealer: DEALER,
      existingListings: [{ id: 'listing-existing', vin: 'VIN-EXIST' }],
    });
    const csv = buildCsv([{ VIN: 'VIN-EXIST', Year: '1969', Make: 'Chevrolet', Model: 'Camaro', BodyStyle: 'Coupe', 'List Price': '55000', Transmission: 'Manual' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].updated).toBe(1);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(updateCalls[0].id).toBe('listing-existing');
    expect(updateCalls[0].payload.is_sold).toBe(false);
  });

  it('marks a previously-synced VIN as sold when it no longer appears in the feed', async () => {
    const { updateCalls } = makeSupabaseMock({
      dealer: DEALER,
      existingListings: [{ id: 'listing-gone', vin: 'VIN-GONE' }],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => buildCsv([]) }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].markedSold).toBe(1);
    expect(updateCalls[0]).toEqual({ id: 'listing-gone', payload: { is_sold: true } });
  });

  it('skips rows with neither a VIN nor a stock number rather than crashing', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{ Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].skipped).toBe(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('falls back to matching by stock number when a row has no VIN', async () => {
    const { updateCalls } = makeSupabaseMock({
      dealer: DEALER,
      existingListings: [{ id: 'listing-existing', vin: null, stock_number: 'STK-1' }],
    });
    const csv = buildCsv([{ 'Stock Number': 'STK-1', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '31000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].updated).toBe(1);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(updateCalls[0]).toMatchObject({ id: 'listing-existing', payload: { price: 31000, stock_number: 'STK-1' } });
  });

  it('inserts a new vehicle by stock number alone, saving it via a follow-up write', async () => {
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{ 'Stock Number': 'STK-NEW', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '31000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].inserted).toBe(1);
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_vin: null }));
  });

  it("doesn't re-match a stock number that belongs to a different dealer's listing", async () => {
    // existingListings is already scoped per-dealer by the real query (.eq('seller_id', dealer.id)),
    // so this test just confirms a stock number only in *this* dealer's list is required to match --
    // an empty list (as if another dealer owns that stock number) results in a fresh insert, not an update.
    makeSupabaseMock({ dealer: DEALER, existingListings: [] });
    const csv = buildCsv([{ 'Stock Number': 'STK-SHARED', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '31000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].inserted).toBe(1);
    expect(res._data.results['info@survivor-cars.com'].updated).toBe(0);
  });
});
