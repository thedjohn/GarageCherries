import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockFrom, mockRpc, mockNotifyAdmin, mockLoggerInfo, mockLoggerWarn, mockLoggerFlush,
  mockSubmitToIndexNow, mockSftpConnect, mockSftpGet, mockSftpEnd,
} = vi.hoisted(() => ({
  mockFrom:             vi.fn(),
  mockRpc:              vi.fn(),
  mockNotifyAdmin:      vi.fn(),
  mockLoggerInfo:       vi.fn(),
  mockLoggerWarn:       vi.fn(),
  mockLoggerFlush:      vi.fn().mockResolvedValue(undefined),
  mockSubmitToIndexNow: vi.fn().mockResolvedValue(undefined),
  mockSftpConnect:      vi.fn().mockResolvedValue(undefined),
  mockSftpGet:          vi.fn(),
  mockSftpEnd:          vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: mockLoggerWarn, error: vi.fn(), flush: mockLoggerFlush }),
}));
vi.mock('@/lib/indexNow', () => ({ submitToIndexNow: mockSubmitToIndexNow }));
vi.mock('ssh2-sftp-client', () => ({
  default: vi.fn().mockImplementation(function () {
    return { connect: mockSftpConnect, get: mockSftpGet, end: mockSftpEnd };
  }),
}));
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

// Defaults a real Images Urls value so tests unrelated to photos don't need
// to think about them -- sync now skips any row with zero images, so a test
// that actually wants to exercise that (or the empty-images case generally)
// overrides this explicitly.
function csvRow(fields: Partial<Record<string, string>>) {
  const withDefaults: Partial<Record<string, string>> = { 'Images Urls': 'https://example.com/default.jpg', ...fields };
  return HEADER.map(h => `"${(withDefaults[h] ?? '').replace(/"/g, '""')}"`).join(',');
}
function buildCsv(rows: Partial<Record<string, string>>[]) {
  return [HEADER.map(h => `"${h}"`).join(','), ...rows.map(csvRow)].join('\n');
}

const CURRENT_HOUR = new Date().getUTCHours();
type TestDealerRow = {
  id: string; name: string; phone: string; email: string; location: string; state: string;
  feed_url: string | null;
  feed_protocol?: string; feed_host?: string; feed_port?: number;
  feed_username?: string; feed_password?: string; feed_remote_path?: string | null;
  feed_sftp_last_received_at?: string | null; feed_format?: string;
};
const DEALER: TestDealerRow = {
  id: 'dealer-1', name: 'Survivor Classic Car Services', phone: '555-1234', email: 'info@survivor-cars.com',
  location: 'Tampa', state: 'FL', feed_url: 'https://example.com/feed.csv',
};

function makeSupabaseMock({ dealers, existingListings = [] as { id: string; vin: string | null; stock_number?: string | null }[], updateError = null as string | null }: {
  dealers: TestDealerRow[];
  existingListings?: { id: string; vin: string | null; stock_number?: string | null }[];
  updateError?: string | null;
}) {
  const listingUpdateCalls: { id: string; payload: any }[] = [];
  const dealerUpdateCalls: { id: string; payload: any }[] = [];
  const dealerQueryCalls: { col: string; val: any }[] = [];

  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return {
        select: () => ({
          eq: (col: string, val: any) => {
            dealerQueryCalls.push({ col, val });
            return { or: () => Promise.resolve({ data: dealers }) };
          },
        }),
        update: (payload: any) => ({
          eq: (_col: string, id: string) => { dealerUpdateCalls.push({ id, payload }); return Promise.resolve({ error: null }); },
        }),
      };
    }
    if (table === 'listings') {
      return {
        select: () => ({ eq: () => Promise.resolve({ data: existingListings }) }),
        update: (payload: any) => ({
          eq: (_col: string, id: string) => {
            listingUpdateCalls.push({ id, payload });
            return Promise.resolve({ error: updateError ? new Error(updateError) : null });
          },
        }),
      };
    }
    // Mark-sold fires a fire-and-forget watcher notification (notifyWatchersCarSold);
    // no watchlist rows in these tests means it safely no-ops before touching
    // anything else (auth.admin.listUsers, dealers), so an empty result is enough.
    if (table === 'watchlists') {
      return { select: () => ({ eq: () => Promise.resolve({ data: [] }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { listingUpdateCalls, dealerUpdateCalls, dealerQueryCalls };
}

const originalFetch = global.fetch;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret';
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

  it('queries dealers by the current UTC hour, so only dealers whose feed_sync_hour matches get synced', async () => {
    const { dealerQueryCalls } = makeSupabaseMock({ dealers: [] });
    vi.stubGlobal('fetch', vi.fn());

    await GET(makeRequest('Bearer cron-secret'));
    expect(dealerQueryCalls[0]).toEqual({ col: 'feed_sync_hour', val: CURRENT_HOUR });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('records an error when the feed fetch fails', async () => {
    makeSupabaseMock({ dealers: [DEALER] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].errors[0]).toContain('Could not fetch feed');
  });

  it('stamps feed_last_synced_at and feed_last_sync_summary on the dealer row after syncing', async () => {
    const { dealerUpdateCalls } = makeSupabaseMock({ dealers: [DEALER] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => buildCsv([]) }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(dealerUpdateCalls[0].id).toBe('dealer-1');
    expect(dealerUpdateCalls[0].payload.feed_last_synced_at).toBeTruthy();
    expect(dealerUpdateCalls[0].payload.feed_last_sync_summary).toBe('0 inserted, 0 updated, 0 sold, 0 skipped');
  });

  it('inserts a new vehicle not already in our listings, flags it feed-managed, and submits it to IndexNow', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
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
    expect(mockSubmitToIndexNow).toHaveBeenCalled();
  });

  it('sets is_feed_managed true on the follow-up write after inserting', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-NEW', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    const followUp = listingUpdateCalls.find(c => c.payload.is_feed_managed !== undefined);
    expect(followUp!.payload.is_feed_managed).toBe(true);
  });

  it('sets listed_at on the follow-up write after inserting, so "days on market" is never computed from a null date', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-NEW-2', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    const followUp = listingUpdateCalls.find(c => c.payload.listed_at !== undefined);
    expect(followUp!.payload.listed_at).toBeTruthy();
    expect(new Date(followUp!.payload.listed_at).getFullYear()).toBeGreaterThan(2000);
  });

  it('does not overwrite listed_at when updating an existing feed-synced listing', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-existing', vin: 'VIN-EXIST-2' }],
    });
    const csv = buildCsv([{ VIN: 'VIN-EXIST-2', Year: '1969', Make: 'Chevrolet', Model: 'Camaro', BodyStyle: 'Coupe', 'List Price': '55000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(listingUpdateCalls[0].payload.listed_at).toBeUndefined();
  });

  it("uses each row's own City/State/Dealer Phone/Dealer Email, not the dealer account's fields, for multi-location dealers", async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
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
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
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
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
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
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-OBSCURE', Year: '1990', Make: 'Wartburg', Model: '353', BodyStyle: 'Sedan', 'List Price': '9000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.ok).toBe(true); // not a failure -- the car still imported
    expect(res._data.results['info@survivor-cars.com'].inserted).toBe(1);
    expect(res._data.results['info@survivor-cars.com'].unrecognizedMakes).toEqual(['Wartburg']);
    expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer feed sync found unrecognized makes', expect.stringContaining('Wartburg'));
  });

  it('does not flag a make already in MAKES', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-KNOWN-MAKE', Year: '1970', Make: 'Chevrolet', Model: 'Camaro', BodyStyle: 'Coupe', 'List Price': '40000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].unrecognizedMakes).toEqual([]);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it("falls back to the dealer account's own location/phone/email when a row leaves them blank", async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
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
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-AUTO', Year: '1970', Make: 'Chevrolet', Model: 'Chevelle', BodyStyle: 'Coupe',
      'List Price': '40000', Transmission: 'Turbo 400 Automatic',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_transmission: 'Automatic' }));
  });

  it('maps Hatchback to Coupe', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-HATCH', Year: '1979', Make: 'Datsun', Model: '280ZX', BodyStyle: 'Hatchback',
      'List Price': '15000', Transmission: 'Manual',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_body_style: 'Coupe' }));
  });

  it('skips motorcycle rows (cruiser/touring body styles) entirely', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([
      { VIN: 'VIN-MOTO-1', Year: '2016', Make: 'Harley Davidson', Model: 'FLD Switchback', BodyStyle: 'cruiser', 'List Price': '9000' },
      { VIN: 'VIN-MOTO-2', Year: '1988', Make: 'Harley Davidson', Model: 'FLHTC Electra Glide', BodyStyle: 'touring', 'List Price': '9000' },
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].skipped).toBe(2);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('updates an existing listing matched by VIN instead of inserting a duplicate, and (re)flags it feed-managed', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-existing', vin: 'VIN-EXIST' }],
    });
    const csv = buildCsv([{ VIN: 'VIN-EXIST', Year: '1969', Make: 'Chevrolet', Model: 'Camaro', BodyStyle: 'Coupe', 'List Price': '55000', Transmission: 'Manual' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].updated).toBe(1);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(listingUpdateCalls[0].id).toBe('listing-existing');
    expect(listingUpdateCalls[0].payload.is_sold).toBe(false);
    expect(listingUpdateCalls[0].payload.is_feed_managed).toBe(true);
  });

  it('does not overwrite make/model with a blank value from the feed, so a manually-corrected listing does not get re-blanked on the next sync', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-existing', vin: 'VIN-EXIST' }],
    });
    const csv = buildCsv([{ VIN: 'VIN-EXIST', Year: '1969', Make: '', Model: '', BodyStyle: 'Convertible', 'List Price': '12995', Transmission: 'Manual' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].updated).toBe(1);
    expect(listingUpdateCalls[0].payload).not.toHaveProperty('make');
    expect(listingUpdateCalls[0].payload).not.toHaveProperty('model');
  });

  it('still updates make/model normally when the feed actually has a value', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-existing', vin: 'VIN-EXIST' }],
    });
    const csv = buildCsv([{ VIN: 'VIN-EXIST', Year: '1969', Make: 'Chevrolet', Model: 'Camaro', BodyStyle: 'Coupe', 'List Price': '55000', Transmission: 'Manual' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(listingUpdateCalls[0].payload.make).toBe('Chevrolet');
    expect(listingUpdateCalls[0].payload.model).toBe('Camaro');
  });

  it('normalizes "Mercedes-Benz" to "Mercedes" on insert, so it is never flagged as unrecognized', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{ VIN: 'VIN-MB', Year: '2008', Make: 'Mercedes-Benz', Model: 'CLK350', BodyStyle: 'Convertible', 'List Price': '18000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_make: 'Mercedes' }));
    expect(res._data.results['info@survivor-cars.com'].unrecognizedMakes).toEqual([]);
  });

  it('normalizes "Classic" to "Glassic" only when Sub-Model also says "Glassic" -- real Survivor pattern', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-GLASSIC', Year: '1969', Make: 'Classic', Model: '', 'Sub-Model': '1929 Ford Phaeton Glassic Replica',
      BodyStyle: 'Convertible', 'List Price': '12995',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_make: 'Glassic' }));
  });

  it('does not touch an unrelated "Classic"-labeled listing that has no Glassic giveaway anywhere', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-UNRELATED-CLASSIC', Year: '1958', Make: 'Classic', Model: 'Something', 'Sub-Model': 'Base Trim', 'VDP URL': 'https://example.com/1958-classic-something',
      BodyStyle: 'Sedan', 'List Price': '10000',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_make: 'Classic' }));
    expect(res._data.results['info@survivor-cars.com'].unrecognizedMakes).toEqual(['Classic']);
  });

  it('normalizes "Classic" to "Glassic" when only the VDP URL carries the giveaway word, not Sub-Model', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-GLASSIC-URL', Year: '1969', Make: 'Classic', Model: '', 'Sub-Model': '',
      'VDP URL': 'https://www.survivor-cars.com/vehicles/1585/1969-classic-1929-ford-phaeton-glassic-replica',
      BodyStyle: 'Convertible', 'List Price': '12995',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_make: 'Glassic' }));
  });

  it('normalizes "Mercedes-Benz" to "Mercedes" on update too, so a corrected listing does not get re-split by the next sync', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-existing', vin: 'VIN-EXIST' }],
    });
    const csv = buildCsv([{ VIN: 'VIN-EXIST', Year: '1987', Make: 'Mercedes-Benz', Model: '560 SL', BodyStyle: 'Convertible', 'List Price': '45000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    await GET(makeRequest('Bearer cron-secret'));
    expect(listingUpdateCalls[0].payload.make).toBe('Mercedes');
  });

  it('marks a previously-synced VIN as sold when it no longer appears in the feed', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-gone', vin: 'VIN-GONE' }],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => buildCsv([]) }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].markedSold).toBe(1);
    expect(listingUpdateCalls[0].id).toBe('listing-gone');
    expect(listingUpdateCalls[0].payload.is_sold).toBe(true);
    expect(listingUpdateCalls[0].payload.sold_at).toEqual(expect.any(String));
  });

  it('skips rows with neither a VIN nor a stock number rather than crashing', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{ Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].skipped).toBe(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('skips a row with no images rather than importing an unsellable-looking listing', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{
      VIN: 'VIN-NO-PHOTOS', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe',
      'List Price': '30000', 'Images Urls': '',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].skipped).toBe(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('marks a previously-synced listing as sold if its photos disappear from the feed, even though its VIN is still present', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-now-photoless', vin: 'VIN-LOST-PHOTOS' }],
    });
    const csv = buildCsv([{
      VIN: 'VIN-LOST-PHOTOS', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe',
      'List Price': '30000', 'Images Urls': '',
    }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].markedSold).toBe(1);
    expect(listingUpdateCalls[0].id).toBe('listing-now-photoless');
    expect(listingUpdateCalls[0].payload.is_sold).toBe(true);
  });

  it('falls back to matching by stock number when a row has no VIN', async () => {
    const { listingUpdateCalls } = makeSupabaseMock({
      dealers: [DEALER],
      existingListings: [{ id: 'listing-existing', vin: null, stock_number: 'STK-1' }],
    });
    const csv = buildCsv([{ 'Stock Number': 'STK-1', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '31000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].updated).toBe(1);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(listingUpdateCalls[0]).toMatchObject({ id: 'listing-existing', payload: { price: 31000, stock_number: 'STK-1' } });
  });

  it('inserts a new vehicle by stock number alone, saving it via a follow-up write', async () => {
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
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
    makeSupabaseMock({ dealers: [DEALER], existingListings: [] });
    const csv = buildCsv([{ 'Stock Number': 'STK-SHARED', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '31000' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].inserted).toBe(1);
    expect(res._data.results['info@survivor-cars.com'].updated).toBe(0);
  });

  it('syncs multiple dealers independently when more than one matches the current hour', async () => {
    const dealer2 = { ...DEALER, id: 'dealer-2', email: 'other@dealer.com', feed_url: 'https://example.com/other-feed.csv' };
    makeSupabaseMock({ dealers: [DEALER, dealer2], existingListings: [] });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => buildCsv([{ VIN: 'VIN-A', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]) })
      .mockResolvedValueOnce({ ok: true, text: async () => buildCsv([]) }));

    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.results['info@survivor-cars.com'].inserted).toBe(1);
    expect(res._data.results['other@dealer.com'].inserted).toBe(0);
  });

  describe('SFTP feeds', () => {
    const SFTP_DEALER: TestDealerRow = {
      id: 'dealer-sftp', name: 'McGinty Motor Cars', phone: '555-9999', email: 'inventory@mcgintymotorcars.com',
      location: 'Springfield', state: 'IL', feed_url: null,
      feed_protocol: 'sftp', feed_host: 'sftp.dealer.com', feed_port: 22,
      feed_username: 'mcginty', feed_password: 'secret', feed_remote_path: '/export/inventory.csv',
    };

    it('downloads the feed via SFTP instead of HTTPS when feed_protocol is sftp', async () => {
      makeSupabaseMock({ dealers: [SFTP_DEALER], existingListings: [] });
      vi.stubGlobal('fetch', vi.fn());
      const csv = buildCsv([{ VIN: 'VIN-SFTP-1', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]);
      mockSftpGet.mockResolvedValue(Buffer.from(csv));

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(mockSftpConnect).toHaveBeenCalledWith({ host: 'sftp.dealer.com', port: 22, username: 'mcginty', password: 'secret' });
      expect(mockSftpGet).toHaveBeenCalledWith('/export/inventory.csv');
      expect(mockSftpEnd).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(res._data.results['inventory@mcgintymotorcars.com'].inserted).toBe(1);
    });

    it('records an error and still ends the connection when the SFTP download fails', async () => {
      makeSupabaseMock({ dealers: [SFTP_DEALER], existingListings: [] });
      mockSftpGet.mockRejectedValue(new Error('Authentication failed'));

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.results['inventory@mcgintymotorcars.com'].errors[0]).toContain('Authentication failed');
      expect(mockSftpEnd).toHaveBeenCalled();
    });

    it('records an error instead of connecting when the SFTP config is missing a remote path', async () => {
      makeSupabaseMock({ dealers: [{ ...SFTP_DEALER, feed_remote_path: null }], existingListings: [] });

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.results['inventory@mcgintymotorcars.com'].errors[0]).toContain('missing host, username, or remote file path');
      expect(mockSftpConnect).not.toHaveBeenCalled();
    });

    it('includes SFTP-configured dealers in the query even though they have no feed_url', async () => {
      const { dealerQueryCalls } = makeSupabaseMock({ dealers: [] });
      await GET(makeRequest('Bearer cron-secret'));
      // The real query combines feed_sync_hour with an OR across feed_url/feed_protocol -- this
      // just confirms the eq() call still fires correctly now that .or() sits after it.
      expect(dealerQueryCalls[0]).toEqual({ col: 'feed_sync_hour', val: CURRENT_HOUR });
    });
  });

  describe('push feeds (sftp_incoming)', () => {
    const PUSH_DEALER: TestDealerRow = {
      id: 'dealer-push', name: 'Push Motors', phone: '555-1111', email: 'inventory@pushmotors.com',
      location: 'Reno', state: 'NV', feed_url: null, feed_protocol: 'sftp_incoming',
      feed_sftp_last_received_at: null,
    };

    beforeEach(() => {
      process.env.VPS_URL = 'https://video.garagecherries.com';
      process.env.VPS_SFTP_BRIDGE_SECRET = 'bridge-secret';
    });

    it('fetches via the VPS bridge instead of HTTPS or outbound SFTP when feed_protocol is sftp_incoming', async () => {
      makeSupabaseMock({ dealers: [PUSH_DEALER], existingListings: [] });
      const csv = buildCsv([{ VIN: 'VIN-PUSH-1', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200,
        json: async () => ({ text: csv, mtime: '2026-07-29T00:45:00.000Z' }),
      }));

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(global.fetch).toHaveBeenCalledWith(
        'https://video.garagecherries.com/dealer-feed/dealers/dealer-push/feed',
        { headers: { Authorization: 'Bearer bridge-secret' } },
      );
      expect(mockSftpConnect).not.toHaveBeenCalled();
      expect(res._data.results['inventory@pushmotors.com'].inserted).toBe(1);
    });

    it("includes a since= param built from the dealer's last received timestamp", async () => {
      makeSupabaseMock({ dealers: [{ ...PUSH_DEALER, feed_sftp_last_received_at: '2026-07-28T12:00:00.000Z' }] });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(global.fetch).toHaveBeenCalledWith(
        'https://video.garagecherries.com/dealer-feed/dealers/dealer-push/feed?since=2026-07-28T12%3A00%3A00.000Z',
        { headers: { Authorization: 'Bearer bridge-secret' } },
      );
    });

    it('treats a 204 (nothing new) as a clean no-op, not an error', async () => {
      const { dealerUpdateCalls } = makeSupabaseMock({ dealers: [PUSH_DEALER] });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.results['inventory@pushmotors.com'].errors).toEqual([]);
      expect(res._data.results['inventory@pushmotors.com'].inserted).toBe(0);
      // No new content means no mtime to stamp -- feed_sftp_last_received_at should be left alone.
      expect(dealerUpdateCalls[0].payload).not.toHaveProperty('feed_sftp_last_received_at');
    });

    it('records an error when no file has ever been uploaded (404 from the bridge)', async () => {
      makeSupabaseMock({ dealers: [PUSH_DEALER] });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.results['inventory@pushmotors.com'].errors[0]).toContain('No feed file has been uploaded yet');
    });

    it('records an error instead of calling the bridge when VPS_URL/VPS_SFTP_BRIDGE_SECRET are not configured', async () => {
      delete process.env.VPS_URL;
      makeSupabaseMock({ dealers: [PUSH_DEALER] });
      vi.stubGlobal('fetch', vi.fn());

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(global.fetch).not.toHaveBeenCalled();
      expect(res._data.results['inventory@pushmotors.com'].errors[0]).toContain('not configured');
    });

    it("stamps feed_sftp_last_received_at with the file's own mtime, not wall-clock time, after processing new content", async () => {
      const { dealerUpdateCalls } = makeSupabaseMock({ dealers: [PUSH_DEALER], existingListings: [] });
      const csv = buildCsv([{ VIN: 'VIN-PUSH-2', Year: '1970', Make: 'Ford', Model: 'Mustang', BodyStyle: 'Coupe', 'List Price': '30000' }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200,
        json: async () => ({ text: csv, mtime: '2026-07-29T00:45:00.000Z' }),
      }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(dealerUpdateCalls[0].payload.feed_sftp_last_received_at).toBe('2026-07-29T00:45:00.000Z');
    });

    it('rejects a feed missing expected columns instead of processing it as real data (guards against a mid-write read)', async () => {
      makeSupabaseMock({ dealers: [PUSH_DEALER], existingListings: [] });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200,
        // Truncated/malformed: missing most of the header a real upload would have.
        json: async () => ({ text: '"VIN","Ye', mtime: '2026-07-29T00:45:00.000Z' }),
      }));

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.results['inventory@pushmotors.com'].errors[0]).toContain('failed validation');
      expect(res._data.results['inventory@pushmotors.com'].inserted).toBe(0);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // Real header, column names, and sample values taken directly from an actual
  // Dealer Car Search export (buyyourride.net) rather than invented, to catch
  // any mismatch against what that platform's dealers will really send.
  describe('Dealer Car Search format (feed_format)', () => {
    const HEADER_DCS = [
      'Dealer ID', 'VIN', 'Make', 'Model', 'Trim', 'Drive Type', 'Transmission Type', 'Year', 'Stock Number',
      'Interior Type', 'Interior Color', 'Exterior Color', 'Cylinders', 'Cost', 'Wholesale', 'Retail', 'Internet Price',
      'Mileage', 'Purchase Date', 'Video URL', 'Options', 'Images', 'Last Modified Date', 'Body Type', 'Engine',
      'MPG City', 'MPG Highway', 'New / Used', 'MSRP', 'Image Last Modified Date', 'Comments', 'Certified Pre Owned',
      'Vehicle Link',
    ];
    function csvRowDcs(fields: Partial<Record<string, string>>) {
      const withDefaults: Partial<Record<string, string>> = { Images: 'https://example.com/default.jpg', ...fields };
      return HEADER_DCS.map(h => `"${(withDefaults[h] ?? '').replace(/"/g, '""')}"`).join(',');
    }
    function buildCsvDcs(rows: Partial<Record<string, string>>[]) {
      return [HEADER_DCS.map(h => `"${h}"`).join(','), ...rows.map(csvRowDcs)].join('\n');
    }
    const DEALER_DCS: TestDealerRow = { ...DEALER, id: 'dealer-dcs', email: 'inventory@buyyourride.net', feed_format: 'dealer_car_search' };

    it('falls back to Retail when Internet Price is blank -- real sample row (Chevrolet SSR)', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: '1GCES14H76B122583', Year: '2006', Make: 'Chevrolet', Model: 'SSR', Trim: '',
        'Stock Number': '123539C', 'Body Type': 'Truck', 'Internet Price': '', Retail: '36495', Mileage: '50655',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_price: 36495 }));
    });

    it('falls back to Retail when Internet Price is an explicit "0" -- real sample row (Toyota 4Runner)', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: 'JTEBU5JR6J5553629', Year: '2018', Make: 'Toyota', Model: '4Runner', Trim: 'TRD Off-Road Premium S',
        'Stock Number': '553629R', 'Body Type': 'SUV', 'Internet Price': '0', Retail: '40500', Mileage: '51561',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_price: 40500 }));
    });

    it('uses Internet Price directly when it is actually populated', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: 'VIN-REAL-INTERNET-PRICE', Year: '2020', Make: 'Honda', Model: 'Civic', 'Stock Number': 'S1',
        'Body Type': 'Sedan', 'Internet Price': '22000', Retail: '24000',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_price: 22000 }));
    });

    it('extracts Images URLs when comma-separated -- confirmed against Vaughns\' real production export', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: 'VIN-COMMA-IMAGES', Year: '2020', Make: 'Honda', Model: 'Civic', 'Stock Number': 'S2', 'Body Type': 'Sedan',
        Images: 'https://example.com/1.jpg,https://example.com/2.jpg,https://example.com/3.jpg',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
        p_images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
      }));
    });

    // Extraction is delimiter-agnostic by design (matches URLs directly rather
    // than splitting on an assumed separator character) -- this proves a
    // *different* dealer on the same feed_format using pipe instead of comma
    // (the original, wrong assumption Vaughns' real data broke) now works
    // too, without any per-dealer or per-format configuration.
    it('extracts Images URLs regardless of separator character -- pipe, semicolon, and whitespace all work with no per-format config', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: 'VIN-MIXED-SEP-IMAGES', Year: '2021', Make: 'Toyota', Model: 'Camry', 'Stock Number': 'S3', 'Body Type': 'Sedan',
        Images: 'https://example.com/1.jpg|https://example.com/2.jpg; https://example.com/3.jpg https://example.com/4.jpg',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
        p_images: [
          'https://example.com/1.jpg', 'https://example.com/2.jpg',
          'https://example.com/3.jpg', 'https://example.com/4.jpg',
        ],
      }));
    });

    it('reads Trim as the sub-model, appended to the title -- real sample row (Mercedes GLC-Class), and normalizes "Mercedes-Benz" to "Mercedes"', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: 'WDC0G4JB6JV037393', Year: '2018', Make: 'Mercedes-Benz', Model: 'GLC-Class', Trim: '300',
        'Stock Number': '037393C', 'Body Type': 'SUV', 'Internet Price': '', Retail: '26995',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({ p_make: 'Mercedes', p_title: '2018 Mercedes GLC-Class 300' }));
    });

    it('strips the repeated reconditioning boilerplate off the end of Comments, keeping the real per-vehicle text', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const realDescription = "The 2018 Mercedes-Benz GLC-Class sets a high bar for the compact luxury crossover class.";
      const boilerplate = "Maintenance and Reconditioning:Every one of our vehicles goes through a thorough safety inspection.";
      const csv = buildCsvDcs([{
        VIN: 'VIN-STRIP-TEST', Year: '2018', Make: 'Mercedes-Benz', Model: 'GLC-Class', 'Stock Number': 'S3',
        'Body Type': 'SUV', Comments: `${realDescription} ${boilerplate}`,
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      const call = mockRpc.mock.calls.find(c => c[1].p_vin === 'VIN-STRIP-TEST');
      expect(call![1].p_description).toBe(realDescription);
      expect(call![1].p_description).not.toContain('Maintenance and Reconditioning');
    });

    it('passes Comments through unstripped when the boilerplate marker is not present', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: 'VIN-NO-MARKER', Year: '2020', Make: 'Honda', Model: 'Civic', 'Stock Number': 'S4', 'Body Type': 'Sedan',
        Comments: 'A totally different dealer wrote their own unique comments here.',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
        p_description: 'A totally different dealer wrote their own unique comments here.',
      }));
    });

    it('reads Exterior Color, Engine, and Transmission Type using this format\'s column names', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      const csv = buildCsvDcs([{
        VIN: 'VIN-FIELDS', Year: '2018', Make: 'McLaren', Model: '720s', 'Stock Number': 'S5', 'Body Type': 'Coupe',
        'Exterior Color': 'BLUE', Engine: '4.0L', 'Transmission Type': 'Automatic',
      }]);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => csv }));

      await GET(makeRequest('Bearer cron-secret'));
      expect(mockRpc).toHaveBeenCalledWith('insert_listing_with_limit', expect.objectContaining({
        p_color: 'BLUE', p_engine: '4.0L', p_transmission: 'Automatic',
      }));
    });

    it('still validates on the shared required columns (VIN, Stock Number, Year, Make, Model) for this format', async () => {
      makeSupabaseMock({ dealers: [DEALER_DCS], existingListings: [] });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '"VIN","Year' }));

      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.results['inventory@buyyourride.net'].errors[0]).toContain('failed validation');
    });
  });
});
