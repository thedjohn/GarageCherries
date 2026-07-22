import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { createLogger } from '@/lib/logger';
import { submitToIndexNow } from '@/lib/indexNow';
import { MAKES } from '@/lib/types';

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

function mapTransmission(raw: string): string {
  return /manual/i.test(raw) ? 'Manual' : 'Automatic';
}

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
}

type FeedDealer = { id: string; name: string; phone: string | null; email: string; location: string | null; state: string | null };

// Fetches one dealer's CSV feed and syncs it: inserts new vehicles (matched by
// VIN, falling back to Stock Number), updates existing ones, and marks as sold
// any previously-synced VIN/Stock Number no longer present in the feed. Shared
// by both the scheduled cron below and the dealer-triggered on-demand sync.
export async function syncDealerFeed(admin: ReturnType<typeof createAdminClient>, dealer: FeedDealer, feedUrl: string, knownMakes: Set<string>): Promise<FeedSyncResult> {
  const result: FeedSyncResult = { inserted: 0, updated: 0, markedSold: 0, skipped: 0, errors: [], unrecognizedMakes: [] };

  let csvText: string;
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
    csvText = await res.text();
  } catch (e) {
    result.errors.push(`Could not fetch feed: ${(e as Error).message}`);
    return result;
  }

  const rows = parseCSV(csvText.replace(/^﻿/, ''));
  const header = rows[0];
  const idx = (name: string) => header.indexOf(name);
  const dataRows = rows.slice(1);

  const { data: existingListings } = await admin
    .from('listings')
    .select('id, vin, stock_number')
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
    const bodyStyleRaw = r[idx('BodyStyle')]?.trim();
    if (SKIP_BODY_STYLES.has(bodyStyleRaw)) { result.skipped++; continue; }

    const vin = r[idx('VIN')]?.trim() || null;
    const stockNumber = r[idx('Stock Number')]?.trim() || null;
    if (!vin && !stockNumber) { result.skipped++; continue; }

    const year = parseInt(r[idx('Year')], 10);
    const make = r[idx('Make')]?.trim();
    // Import the car regardless -- a make not yet in our official MAKES list is a
    // real data-review item, not a reason to drop otherwise-sellable inventory.
    // Flagged here so it surfaces for a deliberate add/reject decision.
    if (make && !knownMakes.has(make.toLowerCase()) && !result.unrecognizedMakes.includes(make)) {
      result.unrecognizedMakes.push(make);
    }
    const model = r[idx('Model')]?.trim();
    const subModel = r[idx('Sub-Model')]?.trim();
    const price = parseInt(r[idx('List Price')], 10) || 0;
    const mileage = parseInt(r[idx('Mileage')], 10) || null;
    const bodyStyle = BODY_STYLE_MAP[bodyStyleRaw] ?? bodyStyleRaw;
    const transmission = mapTransmission(r[idx('Transmission')] ?? '');
    const engine = r[idx('Engine Size')]?.trim() || null;
    const color = r[idx('Basic Exterior Color')]?.trim() || r[idx('Factory Exterior Color')]?.trim() || null;
    const rawImages = (r[idx('Images Urls')] ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const images = selectRepresentativeImages(rawImages, 30);
    const description = r[idx('Long Description')]?.trim() ?? '';
    const title = `${year} ${make} ${model}${subModel ? ` ${subModel}` : ''}`;

    // Multi-location dealers (e.g. Survivor: Tampa/Chicago/Atlanta) have genuinely
    // different city/state/phone/email per row. The City/State columns are blank
    // on every row for this vendor, but "Dealer Name" is really a "City, State"
    // location label (e.g. "Tampa, Florida") -- parse that first. Seller *name*
    // is always the dealer's real business name (dealer.name), never this column.
    const dealerNameLoc = parseDealerNameLocation(r[idx('Dealer Name')] ?? '');
    const listingLocation = r[idx('City')]?.trim() || dealerNameLoc?.city || dealer.location;
    const listingState = r[idx('State')]?.trim() || dealerNameLoc?.state || dealer.state;
    const listingPhone = r[idx('Dealer Phone Number')]?.trim() || dealer.phone;
    const listingEmail = r[idx('Dealer Email Address')]?.trim() || dealer.email;

    const existingId = (vin && existingByVin.get(vin)) || (stockNumber && existingByStock.get(stockNumber)) || undefined;

    if (existingId) {
      seenIds.add(existingId);
      const { error } = await admin.from('listings').update({
        title, year, make, model, price, mileage,
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
  for (const l of existingListings ?? []) {
    if (!seenIds.has(l.id)) {
      const { error } = await admin.from('listings').update({ is_sold: true }).eq('id', l.id);
      if (error) result.errors.push(`Mark-sold failed for listing ${l.id}: ${error.message}`);
      else result.markedSold++;
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
    .select('id, name, phone, email, location, state, feed_url')
    .not('feed_url', 'is', null)
    .eq('feed_sync_hour', currentHour);

  const results: Record<string, FeedSyncResult> = {};

  for (const dealer of (dealers ?? []) as (FeedDealer & { feed_url: string })[]) {
    const result = await syncDealerFeed(admin, dealer, dealer.feed_url, knownMakes);
    results[dealer.email] = result;

    await admin.from('dealers').update({
      feed_last_synced_at: new Date().toISOString(),
      feed_last_sync_summary: summarizeFeedSync(result),
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
