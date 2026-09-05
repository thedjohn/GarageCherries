import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { createLogger } from '@/lib/logger';
import { submitToIndexNow } from '@/lib/indexNow';
import { notifyWatchersCarSold } from '@/lib/notifyCarSold';
import { deleteListingVideos } from '@/lib/deleteListingVideos';
import { MAKES } from '@/lib/types';
import Client from 'ssh2-sftp-client';

const log = createLogger('cron/dealer-feed-sync');
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com';

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Handles quoted fields containing commas and embedded newlines (the vendor's
// long descriptions include literal line breaks inside quotes).
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(cur); cur = ''; rows.push(row); row = []; }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

// BodyStyle values that map onto our existing body_style options -- everything
// else in the vendor's list already matches our values directly.
const BODY_STYLE_MAP: Record<string, string> = {
  Hatchback: 'Coupe', // confirmed by the vendor's own Sub-Model field for their one Hatchback row
};
// Not cars -- these are the vendor's motorcycle body-style terms, skipped entirely.
const SKIP_BODY_STYLES = new Set(['cruiser', 'touring']);

// A handful of dealer feeds spell the same manufacturer differently than our
// canonical MAKES list. Normalized here at ingestion, not just left for a
// one-off DB correction, since the next sync would otherwise just overwrite
// a manual fix with whatever the feed sends every time (see the `make ? ... : {}`
// comment below).
const MAKE_ALIASES: Record<string, string> = {
  'mercedes-benz': 'Mercedes',
};
// Some vendors mis-categorize an obscure marque under a generic bucket, with the
// real manufacturer only ever appearing in free text (confirmed for Survivor's
// "Classic"-badged Glassic replicas -- both their feed and their own website
// categorize it as "Classic"). Scoped to require the giveaway word actually
// appear in Sub-Model, so this can't misfire on some other dealer's genuinely
// different "Classic"-labeled listing.
const CONDITIONAL_MAKE_ALIASES: { from: string; giveaway: RegExp; to: string }[] = [
  { from: 'classic', giveaway: /glassic/i, to: 'Glassic' },
];
// Checks both Sub-Model and the vendor's own VDP URL (when present) for the
// giveaway word -- Survivor's real feed has "glassic" in both, and matching
// either one is more robust than depending on a single column.
function normalizeMake(make: string, subModel: string, vdpUrl: string): string {
  const aliased = MAKE_ALIASES[make.toLowerCase()];
  if (aliased) return aliased;
  const conditional = CONDITIONAL_MAKE_ALIASES.find(
    c => c.from === make.toLowerCase() && (c.giveaway.test(subModel) || c.giveaway.test(vdpUrl))
  );
  return conditional ? conditional.to : make;
}

function mapTransmission(raw: string): string {
  return /manual/i.test(raw) ? 'Manual' : 'Automatic';
}

// Per-vendor column-name mapping. Different dealer inventory platforms export
// the same underlying data under different header names -- this is the only
// thing that varies by `dealer.feed_format`; the matching/insert/update/sold
// logic below is 100% shared and format-agnostic (both vendors seen so far
// happen to share identical names for the 5 REQUIRED_FEED_COLUMNS).
interface FeedFormatColumns {
  stockNumber: string;
  subModel: string;
  price: string;
  // Tried first; falls back to `price` if blank/zero. Dealer Car Search's
  // "Internet Price" was found empty/zero on every real sample row for the
  // one dealer checked -- "Retail" is what actually holds the asking price
  // for that export. Not assumed from the field name; confirmed by reading
  // real rows.
  priceFallback?: string;
  transmission: string;
  engine: string;
  // Some vendors split engine type and displacement into two columns (e.g.
  // "V-8 cyl" + "4.2 L") rather than one combined field -- when set, its
  // value is joined with `engine` ("4.2 L V-8 cyl"). Undefined for vendors
  // whose single `engine` column already holds the full description.
  engineSize?: string;
  // Tried in order, first non-blank wins.
  color: string[];
  images: string;
  bodyStyle: string;
  // null = this vendor has no per-vehicle description field at all.
  description: string | null;
  // The following default to the literal column names every existing vendor
  // already uses ('VIN', 'Year', 'Model', 'Make', 'Mileage', 'City', 'State',
  // 'Dealer Phone Number') when left unset -- only set these for a vendor
  // whose export actually spells them differently, confirmed by reading real
  // rows, same bar as every other field here.
  vin?: string;
  year?: string;
  model?: string;
  make?: string;
  mileage?: string;
  city?: string;
  state?: string;
  phone?: string;
  // If set and found in the raw description text, everything from that
  // marker onward is cut off before storing. Dealer Car Search's "Comments"
  // field mixes real per-vehicle copy with an identical reconditioning
  // paragraph appended to every listing -- this strips just that paragraph.
  // Safe no-op if the marker isn't present (e.g. a future dealer on the same
  // platform phrases their boilerplate differently, or has none): the full
  // text just passes through unstripped rather than silently losing content.
  descriptionStripMarker?: string;
}

const FEED_FORMATS: Record<string, FeedFormatColumns> = {
  speed_digital: {
    stockNumber: 'Stock Number',
    subModel: 'Sub-Model',
    price: 'List Price',
    transmission: 'Transmission',
    engine: 'Engine Size',
    color: ['Basic Exterior Color', 'Factory Exterior Color'],
    images: 'Images Urls',
    bodyStyle: 'BodyStyle',
    description: 'Long Description',
  },
  dealer_car_search: {
    stockNumber: 'Stock Number',
    subModel: 'Trim',
    price: 'Internet Price',
    priceFallback: 'Retail',
    transmission: 'Transmission Type',
    engine: 'Engine',
    color: ['Exterior Color'],
    images: 'Images',
    bodyStyle: 'Body Type',
    description: 'Comments',
    descriptionStripMarker: 'Maintenance and Reconditioning:',
  },
  // Bespoke feed Beverly Hills Car Club built specifically for GarageCherries
  // (the URL is .../feeds/garagecherries.csv) -- confirmed against a live
  // sample of the real feed, not assumed from column names alone.
  beverly_hills_car_club: {
    stockNumber: 'StockNumber',
    subModel: 'Trim',
    price: 'Price',
    transmission: 'Transmission',
    engine: 'Engine',
    color: ['ExteriorColor'],
    images: 'Images',
    bodyStyle: 'Body',
    description: 'Description',
  },
  // JTZ Enterprise's feed for Zoom Classic Cars (pushed via SFTP) -- lowercase,
  // no-space column names throughout, confirmed against a real sample row
  // pulled directly off the SFTP account, not assumed.
  jtz_enterprise: {
    stockNumber: 'Stock Number',
    subModel: 'trim',
    price: 'price',
    transmission: 'transmission',
    engine: 'enginetype',
    color: ['color'],
    images: 'photourl_list',
    bodyStyle: 'bodystyle',
    description: 'dealer_notes',
  },
  // McGinty Motorcars' feed, pushed via SFTP from their Dealer.com/DDC export.
  // Lowercase, no-space column names throughout -- confirmed against the real
  // file pulled directly off the SFTP upload directory, not assumed. Unlike
  // every other vendor here, DDC's export also has real per-row
  // dealership_city/dealership_state/dealership_phone columns rather than
  // needing the Dealer-Name-as-"City, State" fallback other vendors rely on.
  dealer_com: {
    stockNumber: 'stocknumber',
    subModel: 'trimlevel',
    price: 'askingprice',
    transmission: 'transmission',
    engine: 'engine',
    engineSize: 'enginesize',
    color: ['exteriorcolor'],
    images: 'images',
    bodyStyle: 'bodystyle',
    description: 'comments',
    vin: 'vin',
    year: 'year',
    model: 'model',
    make: 'make',
    mileage: 'mileage',
    city: 'dealership_city',
    state: 'dealership_state',
    phone: 'dealership_phone',
  },
  // Platt Motors' vendor, AutoCorner -- confirmed against a real header row
  // Autocorner's own support sent directly, not assumed. Every column is
  // prefixed "Vehicle " except Stock Number and List Price. This feed has no
  // engine or per-vehicle description column at all -- `engine` points at a
  // column name that doesn't exist in their file, which resolves to null the
  // same safe way any other vendor's missing optional column does; `description`
  // uses the interface's real null-support for the same reason. No City/State/
  // Phone columns either, so those fall through to the dealer's own profile
  // address, same as every other single-location dealer.
  autocorner: {
    stockNumber: 'Stock Number',
    subModel: 'Vehicle Trim',
    price: 'List Price',
    transmission: 'Transmission Type',
    engine: 'Engine',
    color: ['Exterior Color'],
    images: 'Vehicle Photos',
    bodyStyle: 'Vehicle Body',
    description: null,
    vin: 'Vehicle VIN',
    year: 'Vehicle Year',
    model: 'Vehicle Model',
    make: 'Vehicle Make',
    mileage: 'Miles',
  },
  // All Auto Network's feed for Garage Kept Motors -- confirmed against a real
  // sample pulled directly from the live feed URL, not assumed. No-space
  // PascalCase columns throughout except VIN/Year/Make/Model/Mileage/City/
  // State, which already match the shared defaults.
  all_auto_network: {
    stockNumber: 'StockNumber',
    subModel: 'Sub-Model',
    price: 'ListPrice',
    transmission: 'Transmission',
    engine: 'EngineSize',
    color: ['BasicExteriorColor'],
    images: 'ImagesUrls',
    bodyStyle: 'BodyStyle',
    description: 'LongDescription',
    phone: 'DealerPhoneNumber',
  },
  // HaggleMe's feed (pushed via SFTP) -- confirmed against two real sample
  // rows pulled directly off the SFTP account, not assumed. No trim/sub-model
  // column; "Series" is the closest analog (blank on both sample rows, but
  // present in the header for vehicles where it's filled in). "SalePrice" was
  // blank on both samples with "Price" holding the real asking price, so
  // "Price" is primary and "SalePrice" the fallback, same shape as Dealer Car
  // Search's Internet-Price/Retail pair above (just the opposite way around).
  haggle_me: {
    stockNumber: 'StockNumber',
    subModel: 'Series',
    price: 'Price',
    priceFallback: 'SalePrice',
    transmission: 'Transmission',
    engine: 'Engine',
    color: ['ExteriorColor'],
    images: 'Images',
    bodyStyle: 'BodyStyle',
    description: 'SellerDescription',
  },
};

const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
};

// This vendor's "Dealer Name" column is actually a "City, State" location label
// (e.g. "Tampa, Florida"), not a business name -- the City/State columns
// themselves are blank on every row, so this is the real per-row location data.
function parseDealerNameLocation(dealerName: string): { city: string; state: string } | null {
  const parts = dealerName.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;
  const [city, stateName] = parts;
  const abbr = STATE_NAME_TO_ABBR[stateName.toLowerCase()];
  if (!city || !abbr) return null;
  return { city, state: abbr };
}

// Extracts every http(s) URL directly out of the raw field, rather than
// splitting on an assumed delimiter character. Different vendors -- and
// apparently even different dealers on the *same* vendor platform -- have
// been seen separating multiple image URLs with different characters (comma,
// pipe); a fixed per-format delimiter broke silently for Vaughns Classic
// Cars when their real export turned out to use a different one than the
// demo file the format was originally built against. A URL itself won't
// contain a comma, pipe, semicolon, or whitespace unencoded, so matching the
// URLs themselves is delimiter-agnostic by construction and needs no
// per-vendor configuration at all.
function extractImageUrls(raw: string): string[] {
  return raw.match(/https?:\/\/[^\s,|;]+/g) ?? [];
}

// Picks `max` images spread evenly across the full sequence, rather than the
// first `max` -- a shoot's first photos are often all exterior angles, so an
// even spread across the whole set is more likely to include interior/engine/
// detail shots too. Positional, not content-aware -- it doesn't know what's
// actually in each photo, just spreads the selection across however the
// vendor ordered them.
function selectRepresentativeImages(images: string[], max = 30): string[] {
  if (images.length <= max) return images;
  const step = images.length / max;
  return Array.from({ length: max }, (_, i) => images[Math.floor(i * step)]);
}

export interface FeedSyncResult {
  inserted: number; updated: number; markedSold: number; skipped: number;
  errors: string[]; unrecognizedMakes: string[];
  // Set only by a 'sftp_incoming' sync that found and processed new content --
  // the file's own mtime (reported by the VPS bridge), not wall-clock "now",
  // so the next run's "since" comparison stays correct regardless of any
  // clock skew between the VPS and wherever this cron runs.
  sourceMtime?: string;
}

type FeedDealer = {
  id: string; name: string; phone: string | null; email: string; location: string | null; state: string | null;
  feed_protocol?: string | null; feed_host?: string | null; feed_port?: number | null;
  feed_username?: string | null; feed_password?: string | null; feed_remote_path?: string | null;
  feed_sftp_last_received_at?: string | null; feed_format?: string | null;
};

// Downloads the feed file from an SFTP server instead of a plain HTTPS URL --
// used by dealers whose inventory system (e.g. Dealer.com) only exports via
// FTP/SFTP, not a hosted pull URL.
async function fetchViaSftp(dealer: FeedDealer): Promise<string> {
  if (!dealer.feed_host || !dealer.feed_username || !dealer.feed_remote_path) {
    throw new Error('SFTP feed is missing host, username, or remote file path');
  }
  const sftp = new Client();
  try {
    await sftp.connect({
      host: dealer.feed_host,
      port: dealer.feed_port ?? 22,
      username: dealer.feed_username,
      password: dealer.feed_password ?? undefined,
    });
    const data = await sftp.get(dealer.feed_remote_path);
    return data.toString();
  } finally {
    await sftp.end();
  }
}

// Reads a dealer's pushed file back from the VPS bridge (SFTPGo intake) --
// the dealer's own system already uploaded it there via SFTP, so this is a
// read of what's already landed rather than a pull from anywhere external.
// `since` avoids reprocessing an unchanged file: the bridge returns 204 if
// the file's mtime hasn't advanced past the last value we stored. Returns
// null (not an error) when there's nothing new to sync.
async function fetchViaSftpPush(dealer: FeedDealer): Promise<{ text: string; mtime: string } | null> {
  const vpsUrl = process.env.VPS_URL;
  const bridgeSecret = process.env.VPS_SFTP_BRIDGE_SECRET;
  if (!vpsUrl || !bridgeSecret) {
    throw new Error('SFTP push intake is not configured (VPS_URL/VPS_SFTP_BRIDGE_SECRET missing)');
  }
  const since = dealer.feed_sftp_last_received_at ? `?since=${encodeURIComponent(dealer.feed_sftp_last_received_at)}` : '';
  const res = await fetch(`${vpsUrl}/dealer-feed/dealers/${encodeURIComponent(dealer.id)}/feed${since}`, {
    headers: { Authorization: `Bearer ${bridgeSecret}` },
  });
  if (res.status === 204) return null;
  if (res.status === 404) throw new Error('No feed file has been uploaded yet');
  if (!res.ok) throw new Error(`Bridge fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  return { text: data.text, mtime: data.mtime };
}

// Guards against a read landing mid-upload -- a real race with the push
// model specifically, where a dealer's system could still be writing the
// file when this cron happens to read it. A truncated read is very unlikely
// to still contain a well-formed header with every column this parser
// depends on, so this catches that case before processing garbage as if it
// were a real feed (which risks incorrectly marking cars "sold" that were
// simply cut off by the bad read). Applied to all three protocols uniformly
// since it's a harmless no-op for an already-well-formed feed.
// VIN/Year/Make/Model were the same literal column name across every vendor
// seen until DDC (all lowercase) -- resolved against the format's own names
// (falling back to the original literals) rather than a fixed list, same
// pattern as Stock Number's name already varying (e.g. Beverly Hills Car
// Club uses "StockNumber", no space).
function isValidFeedHeader(header: string[] | undefined, format: FeedFormatColumns): boolean {
  const required = [
    format.vin ?? 'VIN', format.year ?? 'Year', format.make ?? 'Make', format.model ?? 'Model',
    format.stockNumber,
  ];
  return !!header && required.every(col => header.includes(col));
}

// Fetches one dealer's CSV feed and syncs it: inserts new vehicles (matched by
// VIN, falling back to Stock Number), updates existing ones, and marks as sold
// any previously-synced VIN/Stock Number no longer present in the feed. Shared
// by both the scheduled cron below and the dealer-triggered on-demand sync.
export async function syncDealerFeed(admin: ReturnType<typeof createAdminClient>, dealer: FeedDealer, feedUrl: string | null, knownMakes: Set<string>): Promise<FeedSyncResult> {
  const result: FeedSyncResult = { inserted: 0, updated: 0, markedSold: 0, skipped: 0, errors: [], unrecognizedMakes: [] };

  let csvText: string;
  try {
    if (dealer.feed_protocol === 'sftp_incoming') {
      const fetched = await fetchViaSftpPush(dealer);
      if (fetched === null) return result; // nothing new since last sync -- not an error
      csvText = fetched.text;
      result.sourceMtime = fetched.mtime;
    } else if (dealer.feed_protocol === 'sftp') {
      csvText = await fetchViaSftp(dealer);
    } else {
      const res = await fetch(feedUrl ?? '');
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
      csvText = await res.text();
    }
  } catch (e) {
    result.errors.push(`Could not fetch feed: ${(e as Error).message}`);
    return result;
  }

  const rows = parseCSV(csvText.replace(/^﻿/, ''));
  const header = rows[0];
  const format = FEED_FORMATS[dealer.feed_format ?? 'speed_digital'] ?? FEED_FORMATS.speed_digital;
  if (!isValidFeedHeader(header, format)) {
    result.errors.push('Feed content failed validation (missing expected columns) -- possibly read mid-write, will retry next cycle');
    return result;
  }
  const idx = (name: string) => header.indexOf(name);
  const dataRows = rows.slice(1);

  const { data: existingListings } = await admin
    .from('listings')
    .select('id, vin, stock_number, title, youtube_video_id, facebook_reel_id, instagram_media_id, is_feed_managed')
    .eq('seller_id', dealer.id);
  // VIN is the primary match key (globally unique). Stock number is a fallback --
  // only unique *within* this dealer's own inventory, which is fine here since
  // this map is already scoped to a single dealer (.eq('seller_id', dealer.id)
  // above), but it must never be used to match across different dealers.
  const existingByVin = new Map<string, string>();
  const existingByStock = new Map<string, string>();
  for (const l of existingListings ?? []) {
    if (l.vin) existingByVin.set(l.vin, l.id);
    if (l.stock_number) existingByStock.set(l.stock_number, l.id);
  }
  const seenIds = new Set<string>();

  for (const r of dataRows) {
    // Guards against a malformed data row further down in an otherwise
    // well-formed file -- distinct from isValidFeedHeader's guard above,
    // which only checks the header line. Seen in production: HaggleMe's own
    // export tool appended a literal error message as a one-column trailing
    // line ("ERROR: Export Click = Thread was being aborted.<br/>") after an
    // otherwise-clean 899-row file, which crashed every field lookup below
    // instead of just being skipped like any other bad row.
    if (r.length < header.length) { result.skipped++; continue; }
    const bodyStyleRaw = r[idx(format.bodyStyle)]?.trim();
    if (SKIP_BODY_STYLES.has(bodyStyleRaw)) { result.skipped++; continue; }

    const vin = r[idx(format.vin ?? 'VIN')]?.trim() || null;
    const stockNumber = r[idx(format.stockNumber)]?.trim() || null;
    if (!vin && !stockNumber) { result.skipped++; continue; }
    const existingId = (vin && existingByVin.get(vin)) || (stockNumber && existingByStock.get(stockNumber)) || undefined;

    const year = parseInt(r[idx(format.year ?? 'Year')], 10);
    // Not a malformed row -- a real HaggleMe row put shop equipment ("Dyno Jet
    // Machine" / "Computerized Rotary Lift") in as if it were a vehicle, with
    // descriptive text in the Year column instead of a year. `listings.year`
    // is NOT NULL, so this would otherwise surface as a loud insert failure
    // instead of a clean skip like any other not-actually-a-car row (compare
    // SKIP_BODY_STYLES above).
    if (isNaN(year)) { result.skipped++; continue; }
    const model = r[idx(format.model ?? 'Model')]?.trim();
    const subModel = r[idx(format.subModel)]?.trim();
    // Not every vendor's export has this column; idx() returns -1 when absent,
    // and r[-1] is safely undefined -- ?.trim() handles that the same as any
    // other optional column.
    const vdpUrl = r[idx('VDP URL')]?.trim() ?? '';
    const make = normalizeMake(r[idx(format.make ?? 'Make')]?.trim(), subModel, vdpUrl);
    // Import the car regardless -- a make not yet in our official MAKES list is a
    // real data-review item, not a reason to drop otherwise-sellable inventory.
    // Flagged here so it surfaces for a deliberate add/reject decision.
    if (make && !knownMakes.has(make.toLowerCase()) && !result.unrecognizedMakes.includes(make)) {
      result.unrecognizedMakes.push(make);
    }
    const price = parseInt(r[idx(format.price)], 10)
      || (format.priceFallback ? parseInt(r[idx(format.priceFallback)], 10) : 0)
      || 0;
    const mileage = parseInt(r[idx(format.mileage ?? 'Mileage')], 10) || null;
    const bodyStyle = BODY_STYLE_MAP[bodyStyleRaw] ?? bodyStyleRaw;
    const transmission = mapTransmission(r[idx(format.transmission)] ?? '');
    const engine = [
      format.engineSize ? r[idx(format.engineSize)]?.trim() : null,
      r[idx(format.engine)]?.trim(),
    ].filter(Boolean).join(' ') || null;
    const color = format.color.map(col => r[idx(col)]?.trim()).find(Boolean) ?? null;
    const rawImages = extractImageUrls(r[idx(format.images)] ?? '');
    const images = selectRepresentativeImages(rawImages, 30);
    // A listing with no photos at all isn't sellable-looking; manual listings
    // already require at least one photo to save (dealer dashboard's Add
    // Vehicle form), so feed-synced ones shouldn't be exempt from the same
    // bar. An existing listing whose photos disappeared from the feed is
    // deleted outright here, NOT routed through the mark-sold pass below --
    // it didn't actually sell, so flagging is_sold would both inflate the
    // homepage's real "Cars Sold" count and wrongly email anyone watching
    // it that the car sold. Added to seenIds so the mark-sold pass doesn't
    // also try (and fail) to update the now-deleted row.
    if (images.length === 0) {
      result.skipped++;
      if (existingId) {
        seenIds.add(existingId);
        const { error } = await admin.from('listings').delete().eq('id', existingId);
        if (error) result.errors.push(`Delete failed for photo-less listing ${vin ?? stockNumber}: ${error.message}`);
      }
      continue;
    }
    let description = format.description ? (r[idx(format.description)]?.trim() ?? '') : '';
    if (format.descriptionStripMarker) {
      const cut = description.indexOf(format.descriptionStripMarker);
      if (cut !== -1) description = description.slice(0, cut).trim();
    }
    const title = `${year} ${make} ${model}${subModel ? ` ${subModel}` : ''}`;

    // Multi-location dealers (e.g. Survivor: Tampa/Chicago/Atlanta) have genuinely
    // different city/state/phone/email per row. The City/State columns are blank
    // on every row for this vendor, but "Dealer Name" is really a "City, State"
    // location label (e.g. "Tampa, Florida") -- parse that first. Seller *name*
    // is always the dealer's real business name (dealer.name), never this column.
    const dealerNameLoc = parseDealerNameLocation(r[idx('Dealer Name')] ?? '');
    const listingLocation = r[idx(format.city ?? 'City')]?.trim() || dealerNameLoc?.city || dealer.location;
    const listingState = r[idx(format.state ?? 'State')]?.trim() || dealerNameLoc?.state || dealer.state;
    const listingPhone = r[idx(format.phone ?? 'Dealer Phone Number')]?.trim() || dealer.phone;
    const listingEmail = r[idx('Dealer Email Address')]?.trim() || dealer.email;

    if (existingId) {
      seenIds.add(existingId);
      const { error } = await admin.from('listings').update({
        title, year, price, mileage,
        // A blank make/model from the feed shouldn't erase a value that's
        // already correct in our DB -- a vendor's own export can genuinely
        // have this blank for a given row (seen in production: a Glassic
        // replica with no Model value in Survivor's feed) even though we've
        // since corrected it on our end, and unconditionally overwriting on
        // every sync just kept re-blanking it. Only touch these columns when
        // the feed actually sent something for them.
        ...(make ? { make } : {}),
        ...(model ? { model } : {}),
        location: listingLocation, state: listingState,
        condition: 'Good',
        body_style: bodyStyle,
        transmission, engine, color, images, description,
        seller_phone: listingPhone,
        vin, stock_number: stockNumber,
        is_sold: false,
        is_feed_managed: true,
      }).eq('id', existingId);
      if (error) result.errors.push(`Update failed for ${vin ?? stockNumber}: ${error.message}`);
      else result.updated++;
    } else {
      const newId = crypto.randomUUID();
      const slug = `${toSlug(title)}-${Date.now()}`;
      const { error } = await admin.rpc('insert_listing_with_limit', {
        p_id: newId,
        p_slug: slug,
        p_title: title,
        p_year: year,
        p_make: make,
        p_model: model,
        p_price: price,
        p_mileage: mileage,
        p_location: listingLocation,
        p_state: listingState,
        p_condition: 'Good',
        p_body_style: bodyStyle,
        p_transmission: transmission,
        p_engine: engine,
        p_color: color,
        p_images: images,
        p_description: description,
        p_seller_name: dealer.name,
        p_seller_phone: listingPhone,
        p_seller_email: listingEmail,
        p_vin: vin,
        p_vin_verified: false,
        p_featured: false,
        p_status: 'approved',
        p_seller_id: dealer.id,
        p_enforce_limit: false,
      });
      if (error) {
        result.errors.push(`Insert failed for ${vin ?? stockNumber}: ${error.message}`);
      } else {
        seenIds.add(newId);
        // insert_listing_with_limit has no stock-number/is_feed_managed/listed_at
        // parameters -- set them with a small follow-up write rather than changing
        // that shared RPC's signature (same pattern already used for stock_number
        // alone). listed_at is normally set by the admin-approval flow, which this
        // insert bypasses entirely (it goes straight to status: 'approved'); without
        // this, listed_at stays null and "days on market" reads it as the Unix epoch,
        // computing a wildly wrong number of days. Only set on insert, never on the
        // update branch above -- re-syncing an existing listing shouldn't reset when
        // it first went live.
        await admin.from('listings').update({
          ...(stockNumber ? { stock_number: stockNumber } : {}),
          is_feed_managed: true,
          listed_at: new Date().toISOString(),
        }).eq('id', newId);
        result.inserted++;
        // Facebook posting is deliberately NOT triggered here -- a bulk feed sync can
        // insert many listings at once, and posting all of them synchronously either
        // hits Facebook's own rate limit or spams the Page. New inserts start with
        // fb_posted_at null (the column's default), so they're picked up gradually by
        // the hourly facebook-post-queue cron instead, same as any other new listing.
        submitToIndexNow([`${BASE_URL}/listings/${toSlug(make)}/${toSlug(model)}/${newId}/${slug}`]).catch(() => {});
      }
    }
  }

  // Anything previously synced for this dealer but missing from today's feed is sold/removed.
  // Manually-added listings (is_feed_managed: false) are never eligible here --
  // they typically have no VIN/stock number to match against in the first
  // place, so without this check they'd get marked sold on this dealer's very
  // first sync regardless of whether the car is actually still for sale.
  for (const l of existingListings ?? []) {
    if (!l.is_feed_managed) continue;
    if (!seenIds.has(l.id)) {
      const { error } = await admin.from('listings').update({ is_sold: true, sold_at: new Date().toISOString() }).eq('id', l.id);
      if (error) result.errors.push(`Mark-sold failed for listing ${l.id}: ${error.message}`);
      else {
        result.markedSold++;
        void notifyWatchersCarSold(admin, l.id, l.title, dealer.id);
        void deleteListingVideos(admin, l.id, l);
      }
    }
  }

  return result;
}

export function summarizeFeedSync(r: FeedSyncResult): string {
  if (r.errors.length) return `Error: ${r.errors[0]}`;
  return `${r.inserted} inserted, ${r.updated} updated, ${r.markedSold} sold, ${r.skipped} skipped`;
}

// GET /api/cron/dealer-feed-sync
// Runs hourly via Vercel Cron. Syncs every dealer whose feed_sync_hour matches
// the current UTC hour, so each dealer gets one sync per day at their own
// chosen time despite the cron itself firing every hour.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const knownMakes = new Set(MAKES.map(m => m.toLowerCase()));
  const currentHour = new Date().getUTCHours();

  const { data: dealers } = await admin
    .from('dealers')
    .select('id, name, phone, email, location, state, feed_url, feed_protocol, feed_host, feed_port, feed_username, feed_password, feed_remote_path, feed_sftp_last_received_at, feed_format')
    .eq('feed_sync_hour', currentHour)
    .or('feed_url.not.is.null,feed_protocol.eq.sftp,feed_protocol.eq.sftp_incoming');

  const results: Record<string, FeedSyncResult> = {};

  for (const dealer of (dealers ?? []) as (FeedDealer & { feed_url: string | null })[]) {
    const result = await syncDealerFeed(admin, dealer, dealer.feed_url, knownMakes);
    results[dealer.email] = result;

    await admin.from('dealers').update({
      feed_last_synced_at: new Date().toISOString(),
      feed_last_sync_summary: summarizeFeedSync(result),
      // Gated on no errors -- otherwise a content-validation failure (e.g. a
      // feed_format mismatch) permanently "consumes" this mtime marker even
      // though the file was never actually processed, so the bridge's `since`
      // check would tell every later attempt there's nothing new to fetch,
      // silently breaking the "will retry next cycle" promise in that error
      // message for good (found 2026-09-06 chasing exactly that symptom for
      // HaggleMe/Platt Motors Inc).
      ...(result.errors.length === 0 && result.sourceMtime ? { feed_sftp_last_received_at: result.sourceMtime } : {}),
      // Distinct from feed_last_synced_at above, which is stamped on every
      // attempt regardless of outcome -- this only advances on an actual
      // successful sync, so dealer-feed-staleness can tell "still working"
      // from "has been silently failing" for the https/sftp protocols.
      ...(result.errors.length === 0 ? { feed_last_success_at: new Date().toISOString() } : {}),
    }).eq('id', dealer.id);
  }

  const anyErrors = Object.values(results).some(r => r.errors.length > 0);
  const anyUnrecognizedMakes = Object.values(results).some(r => r.unrecognizedMakes.length > 0);

  if (anyErrors) {
    notifyAdmin('Dealer feed sync had errors', JSON.stringify(results, null, 2).replace(/\n/g, '<br/>'));
    log.warn('Dealer feed sync had errors', { results: JSON.stringify(results) });
  } else if (anyUnrecognizedMakes) {
    // Not a failure -- the cars still imported. Just surfaces makes worth a look for
    // possible addition to MAKES, since they weren't caught by the coverage tests.
    notifyAdmin('Dealer feed sync found unrecognized makes', JSON.stringify(results, null, 2).replace(/\n/g, '<br/>'));
    log.info('Dealer feed sync completed with unrecognized makes', { results: JSON.stringify(results) });
  } else {
    log.info('Dealer feed sync completed', { results: JSON.stringify(results) });
  }
  await log.flush();

  return NextResponse.json({ ok: !anyErrors, results });
}
