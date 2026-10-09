import { createLogger } from '@/lib/logger';
import { cleanSellerText, findContactInfo } from '@/lib/youtube/cleanSellerText';
import { YOUTUBE_SELL_PROMO } from '@/lib/youtube/config';

const log = createLogger('lib/youtube');

export interface ListingPostInput {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  slug: string;
  mileage?: number | null;
  condition?: string | null;
  location?: string | null;
  state?: string | null;
  description?: string | null;
  description_paragraphs?: string[] | null;
  hobby_segment?: string | null;
  body_style?: string | null;
  listing_code?: string | null;
  is_sold?: boolean | null;
  status?: string | null;
}

// Checked in this order -- most-specific-signal-wins, so e.g. a "Challenger
// SRT Hellcat" (which also contains "Challenger", a Muscle Car keyword) gets
// tagged #SuperCar rather than the more generic #MuscleCar. Keyed off the
// model text since most classic American makes (Buick, Chevrolet, Oldsmobile,
// Pontiac, etc.) built both muscle cars and ordinary sedans -- make alone
// isn't a reliable signal. Deliberately a plain in-code list (not DB-driven)
// so it's easy to extend as new listings come in that don't match yet.
const VEHICLE_SEGMENT_KEYWORDS: { tag: string; keywords: string[] }[] = [
  { tag: 'SuperCar', keywords: ['Hellcat', 'Demon', 'Redeye', 'Viper', 'GT-R', 'GT40', 'Ford GT', 'ZR1', 'GT3', 'GT2', 'Turbo S'] },
  { tag: 'ExoticCar', keywords: ['Pantera', 'Esprit'] },
  { tag: 'MuscleCar', keywords: ['Charger', 'Challenger', 'Camaro', 'Chevelle', 'Nova', 'GTO', 'Road Runner', 'GTX', 'Barracuda', 'Cuda', 'Mustang', 'Firebird', 'Trans Am', 'Torino', 'Cyclone', 'Javelin', 'AMX', '442', 'GS', 'El Camino', 'Impala SS', 'Fairlane', 'Cobra'] },
  { tag: 'SportsCar', keywords: ['Corvette', 'Miata', 'MGB', 'MGA', 'TR6', 'Spitfire', '911', '914', '924', '928', '944', '968', '240Z', '260Z', '280Z', '300ZX', '350Z', '370Z', 'RX-7', 'RX-8', 'Supra', 'MR2', 'S2000', 'Healey 3000', 'Spider', 'GTV', 'XKE', 'E-Type'] },
];

function buildSegmentHashtag(listing: ListingPostInput): string | null {
  const haystack = `${listing.make} ${listing.model}`.toLowerCase();
  for (const { tag, keywords } of VEHICLE_SEGMENT_KEYWORDS) {
    if (keywords.some(k => haystack.includes(k.toLowerCase()))) return `#${tag}`;
  }
  return null;
}

// Only body styles that people actually search/hashtag by on social media --
// matches the same judgment call already made for this site's Car Guide
// landing pages (2-Door/4-Door/Sedan/SUV skipped there too as too generic).
const HASHTAG_BODY_STYLES = new Set(['Convertible', 'Coupe', 'Roadster', 'Pickup Truck', 'Fastback', 'Station Wagon', 'Hardtop']);

function toSegment(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function buildListingUrl(listing: ListingPostInput): string {
  return `https://www.garagecherries.com/listings/${toSegment(listing.make)}/${toSegment(listing.model)}/${listing.id}/${listing.slug}`;
}

function toHashtag(s: string): string {
  return '#' + s.replace(/[^a-zA-Z0-9]/g, '');
}

function buildHashtags(listing: ListingPostInput): string {
  const tags = [
    '#Shorts',
    '#ClassicCars',
    toHashtag(listing.make),
    toHashtag(`${listing.make}${listing.model}`),
    listing.hobby_segment ? toHashtag(listing.hobby_segment) : null,
    buildSegmentHashtag(listing),
    listing.body_style && HASHTAG_BODY_STYLES.has(listing.body_style) ? toHashtag(listing.body_style) : null,
  ].filter((t): t is string => Boolean(t) && t !== '#');

  return Array.from(new Set(tags)).join(' ');
}

// Same fallback order the listing detail page uses: prefer the rich
// paragraph version when present, otherwise the plain description.
function sellerText(listing: ListingPostInput): string {
  return (listing.description_paragraphs?.length
    ? listing.description_paragraphs.join('\n\n')
    : listing.description) ?? '';
}

// "GC-7KQ4M" -- the human-typeable code viewers search on garagecherries.com
// or visit at /c/<code> (links in Shorts descriptions aren't clickable).
export function formatListingCode(code: string | null | undefined): string | null {
  return code ? `GC-${code.toUpperCase()}` : null;
}

const NOT_RUNNING = /\b(not running|non[- ]?running|does not run|doesn'?t run|won'?t (?:start|run)|no[- ]start)\b/i;
const NUMBERS_MATCHING = /\bnumbers[- ]matching\b/i;
const FRAME_OFF = /\b(frame[- ]off|rotisserie)\b/i;
const ONE_OWNER = /\b(one[- ]owner|1[- ]owner|single[- ]owner)\b/i;
const VERIFIED_MILES = /\b(original|actual|documented|genuine|true)\s+miles\b/i;
// Cars from before ~1981 mostly had 5-digit odometers that roll over, and
// street rods show miles since their build -- "Just 27,981 Miles" on a 1966
// car is likely 127,981. Only lead with mileage when it's trustworthy.
const SIX_DIGIT_ODOMETER_YEAR = 1981;

// Hook-style titles (the format that tested better than the old
// "Year Make Model — $Price | GarageCherries"), picked by simple rules from
// the listing data -- year, make, model and price are always present.
// Strongest signal wins; a car that doesn't run always says so up front.
export function buildYouTubeTitle(listing: ListingPostInput): string {
  const ymm = `${listing.year} ${listing.make} ${listing.model}`;
  const price = fmtPrice(listing.price);
  const text = `${listing.title} ${sellerText(listing)}`;
  const place = listing.location && listing.state ? `${listing.location}, ${listing.state}` : null;
  const isConvertible = listing.body_style === 'Convertible' && !/convertible/i.test(listing.model);
  const notRunning = NOT_RUNNING.test(text);

  const candidates: string[] = [];
  if (notRunning) candidates.push(`Not Running: ${ymm} Project for ${price}`);
  else {
    const milesTrustworthy = listing.year >= SIX_DIGIT_ODOMETER_YEAR || VERIFIED_MILES.test(text);
    if (milesTrustworthy && listing.mileage && listing.mileage > 0 && listing.mileage < 60000) {
      candidates.push(`Just ${listing.mileage.toLocaleString('en-US')} Miles: ${ymm} for ${price}`);
    }
    if (NUMBERS_MATCHING.test(text)) candidates.push(`Numbers-Matching ${ymm} for ${price}`);
    if (FRAME_OFF.test(text)) candidates.push(`Frame-Off Restored ${ymm} for ${price}`);
    if (ONE_OWNER.test(text)) candidates.push(`One-Owner ${ymm} for ${price}`);
    if (isConvertible) candidates.push(`Top-Down Ready: ${ymm} Convertible for ${price}`);
    if (place) candidates.push(`For Sale in ${place}: ${ymm} for ${price}`);
    candidates.push(`For Sale: ${ymm} for ${price}`);
  }

  const fitting = candidates.find(t => t.length <= 100);
  if (fitting) return fitting;
  // A car that doesn't run keeps "Not Running" even when too long for its hook.
  return `${notRunning ? 'Not Running: ' : ''}${ymm} for ${price}`.slice(0, 100);
}

function trackedListingUrl(listing: ListingPostInput): string {
  const params = new URLSearchParams({ utm_source: 'youtube', utm_medium: 'shorts', utm_campaign: 'listing' });
  const code = formatListingCode(listing.listing_code);
  if (code) params.set('utm_content', code);
  return `${buildListingUrl(listing)}?${params.toString()}`;
}

function promoLine(now: number): string | null {
  if (!YOUTUBE_SELL_PROMO.line) return null;
  return now <= new Date(YOUTUBE_SELL_PROMO.expiresAt).getTime() ? YOUTUBE_SELL_PROMO.line : null;
}

const YOUTUBE_DESCRIPTION_LIMIT = 5000;
// Leaves headroom under YouTube's limit for the fixed header/link/hashtags.
const SELLER_TEXT_CAP = 3500;

export function buildYouTubeDescription(listing: ListingPostInput, now: number = Date.now()): string {
  const code = formatListingCode(listing.listing_code);
  const place = listing.location && listing.state ? ` · ${listing.location}, ${listing.state}` : '';

  const header = [
    `${listing.year} ${listing.make} ${listing.model} — ${fmtPrice(listing.price)}${place}`,
    code
      ? `See all photos and contact the seller: garagecherries.com — search code ${code}`
      : 'See all photos and contact the seller: garagecherries.com',
    promoLine(now),
  ].filter(Boolean).join('\n');
  const footer = `Full listing: ${trackedListingUrl(listing)}\n\n${buildHashtags(listing)}`;

  // The header and listing link are never cut -- only the seller's text is
  // truncated to keep the whole description under YouTube's limit.
  const room = Math.min(SELLER_TEXT_CAP, YOUTUBE_DESCRIPTION_LIMIT - header.length - footer.length - 10);
  const cleaned = cleanSellerText(sellerText(listing)).text;
  const body = cleaned.length > room ? cleaned.slice(0, Math.max(0, room - 1)).trimEnd() + '…' : cleaned;

  return [header, body, footer].filter(Boolean).join('\n\n');
}

// A model year written right before the make (e.g. "1975 Chevrolet") near
// the start of the seller's text -- used to catch listings whose year field
// disagrees with what the seller wrote.
function statedYears(text: string, make: string): number[] {
  const escaped = make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b((?:19|20)\\d{2})\\s+${escaped}\\b`, 'gi');
  return [...text.slice(0, 400).matchAll(re)].map(m => Number(m[1]));
}

// Pre-upload checks. Returns the reason the upload must be blocked (for a
// human to review), or null when it's fine to upload. Never guesses a fix.
export function validateYouTubeUpload(listing: ListingPostInput): string | null {
  if (listing.is_sold || (listing.status && listing.status !== 'approved')) {
    return 'Listing is sold or no longer live';
  }
  if (!listing.price || listing.price <= 0) return 'Price is missing or zero';

  const titleYear = listing.title.match(/\b(?:19|20)\d{2}\b/)?.[0];
  if (titleYear && Number(titleYear) !== listing.year) {
    return `Listing title says ${titleYear} but the year field is ${listing.year}`;
  }
  const mismatch = statedYears(sellerText(listing), listing.make).find(y => y !== listing.year);
  if (mismatch) {
    return `Seller text says ${mismatch} ${listing.make} but the year field is ${listing.year}`;
  }

  const description = buildYouTubeDescription(listing).replace(/https:\/\/www\.garagecherries\.com\S*/g, '');
  const leftover = findContactInfo(description);
  if (leftover.length) return `Description still contains contact details: ${leftover.join(', ')}`;
  return null;
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    log.error('YouTube token refresh failed', new Error(data.error_description ?? `HTTP ${res.status}`));
    return null;
  }
  return data.access_token as string;
}

// Designed to never throw: a YouTube upload failure must never break the
// existing Facebook/Instagram Reel posting it's called alongside (fire-and-forget)
// from app/api/video-pipeline/complete/route.ts. Returns whether the upload
// actually succeeded, so callers can record youtube_posted_at.
//
// Unlike Facebook/Instagram (which fetch the video themselves from a URL we
// hand them), YouTube's API requires us to push the actual video bytes via
// its resumable upload protocol -- so this downloads the rendered video from
// the VPS first, then re-uploads it to Google.
export async function postListingReelToYouTube(
  listing: ListingPostInput,
  videoUrl: string,
  privacyStatus: 'public' | 'unlisted' | 'private' = 'public'
): Promise<string | null> {
  try {
    const blocked = validateYouTubeUpload(listing);
    if (blocked) {
      log.warn('YouTube upload blocked by pre-upload checks', { listingId: listing.id, reason: blocked });
      return null;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      log.info('YouTube upload skipped — YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET/YOUTUBE_REFRESH_TOKEN not configured');
      return null;
    }

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      log.error('YouTube upload failed to fetch source video', new Error(`HTTP ${videoRes.status}`), { listingId: listing.id });
      return null;
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({
        snippet: {
          title: buildYouTubeTitle(listing),
          description: buildYouTubeDescription(listing),
          categoryId: '2', // Autos & Vehicles
        },
        status: { privacyStatus, selfDeclaredMadeForKids: false },
      }),
    });

    const uploadUrl = initRes.headers.get('location');
    if (!initRes.ok || !uploadUrl) {
      const errBody = await initRes.text().catch(() => '');
      // Hitting the daily upload cap is a known, already-tracked condition
      // (quota increase requested, pending Google's review) rather than a
      // new bug each time -- warn (Axiom only) instead of error (which pages
      // via Sentry) so the automated retries don't alert on it every day.
      // Matched by reason code, not just message text, since Google returns
      // slightly different wording for different quota mechanisms
      // (rateLimitExceeded, uploadLimitExceeded, quotaExceeded have all been
      // seen in production). Any other init failure still errors normally.
      if (/rateLimitExceeded|uploadLimitExceeded|quotaExceeded|dailyLimitExceeded/.test(errBody)) {
        log.warn('YouTube upload session init failed (daily quota likely exceeded, increase request pending)', { listingId: listing.id, error: errBody || `HTTP ${initRes.status}` });
      } else {
        log.error('YouTube upload session init failed', new Error(errBody || `HTTP ${initRes.status}`), { listingId: listing.id });
      }
      return null;
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBuffer.length) },
      body: videoBuffer,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.id) {
      log.error('YouTube upload failed', new Error(uploadData.error?.message ?? `HTTP ${uploadRes.status}`), { listingId: listing.id });
      return null;
    }

    log.info('YouTube upload succeeded', { listingId: listing.id, videoId: uploadData.id });
    return uploadData.id as string;
  } catch (err) {
    log.error('postListingReelToYouTube threw', err instanceof Error ? err : new Error(String(err)), { listingId: listing.id });
    return null;
  }
}

// Deletes a previously-uploaded YouTube video by ID -- used to clean up the
// old video when a listing's price drop triggers a refreshed repost (YouTube
// has no "replace the file on this video ID" operation, only metadata
// updates, so a real re-render requires a new video ID and cleaning up the
// old one separately). Never throws; a failed delete just leaves the stale
// video up alongside the new one rather than blocking the refresh, same
// tolerance as everywhere else in this pipeline.
export async function deleteYouTubeVideo(videoId: string): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      log.info('YouTube video delete skipped — YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET/YOUTUBE_REFRESH_TOKEN not configured');
      return false;
    }
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok && res.status !== 204) {
      const errBody = await res.text().catch(() => '');
      log.error('YouTube video delete failed', new Error(errBody || `HTTP ${res.status}`), { videoId });
      return false;
    }
    return true;
  } catch (err) {
    log.error('deleteYouTubeVideo threw', err instanceof Error ? err : new Error(String(err)), { videoId });
    return false;
  }
}
