import { createLogger } from '@/lib/logger';

const log = createLogger('lib/youtube');

interface ListingPostInput {
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

function buildTitle(listing: ListingPostInput): string {
  return `${listing.year} ${listing.make} ${listing.model} — ${fmtPrice(listing.price)} | GarageCherries`.slice(0, 100);
}

function buildDescription(listing: ListingPostInput): string {
  const details = [
    listing.mileage ? `${listing.mileage.toLocaleString()} miles` : null,
    listing.condition ? `${listing.condition} condition` : null,
    listing.location && listing.state ? `${listing.location}, ${listing.state}` : null,
  ].filter(Boolean).join(' · ');

  // Same fallback order the listing detail page uses: prefer the rich
  // paragraph version when present, otherwise the plain description.
  const vehicleDescription = listing.description_paragraphs?.length
    ? listing.description_paragraphs.join('\n\n')
    : listing.description;

  // YouTube caps descriptions at 5000 chars -- leave headroom for the
  // fixed template around it (details, link, hashtags) rather than risk
  // the API rejecting an over-length description.
  const trimmedVehicleDescription = vehicleDescription
    ? vehicleDescription.length > 3500 ? vehicleDescription.slice(0, 3500) + '…' : vehicleDescription
    : null;

  return `${listing.year} ${listing.make} ${listing.model} — ${fmtPrice(listing.price)}`
    + (details ? `\n${details}` : '')
    + (trimmedVehicleDescription ? `\n\n${trimmedVehicleDescription}` : '')
    + `\n\nSee full details & more photos: ${buildListingUrl(listing)}`
    + `\n\n${buildHashtags(listing)}`;
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
          title: buildTitle(listing),
          description: buildDescription(listing),
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
