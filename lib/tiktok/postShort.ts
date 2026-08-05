import { createLogger } from '@/lib/logger';

const log = createLogger('lib/tiktok');

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

// Same priority-ordered classifier as lib/youtube/postShort.ts -- kept as a
// separate copy rather than a shared import, matching this codebase's
// existing per-platform file convention (lib/facebook, lib/youtube each have
// their own small helpers rather than a shared cross-platform module).
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

const HASHTAG_BODY_STYLES = new Set(['Convertible', 'Coupe', 'Roadster', 'Pickup Truck', 'Fastback', 'Station Wagon', 'Hardtop']);

function buildHashtags(listing: ListingPostInput): string {
  const tags = [
    '#ClassicCars',
    toHashtag(listing.make),
    toHashtag(`${listing.make}${listing.model}`),
    listing.hobby_segment ? toHashtag(listing.hobby_segment) : null,
    buildSegmentHashtag(listing),
    listing.body_style && HASHTAG_BODY_STYLES.has(listing.body_style) ? toHashtag(listing.body_style) : null,
  ].filter((t): t is string => Boolean(t) && t !== '#');

  return Array.from(new Set(tags)).join(' ');
}

// TikTok has no separate title/description fields -- `post_info.title` is
// the whole caption shown under the video. TikTok's own cap is 2200 chars.
function buildCaption(listing: ListingPostInput): string {
  const details = [
    listing.mileage ? `${listing.mileage.toLocaleString()} miles` : null,
    listing.condition ? `${listing.condition} condition` : null,
    listing.location && listing.state ? `${listing.location}, ${listing.state}` : null,
  ].filter(Boolean).join(' · ');

  const vehicleDescription = listing.description_paragraphs?.length
    ? listing.description_paragraphs.join('\n\n')
    : listing.description;

  const header = `${listing.year} ${listing.make} ${listing.model} — ${fmtPrice(listing.price)}`
    + (details ? `\n${details}` : '')
    + `\n\nSee full details & more photos: ${buildListingUrl(listing)}`
    + `\n\n${buildHashtags(listing)}`;

  // Leave headroom for the fixed header/link/hashtags above rather than
  // risk TikTok rejecting an over-length caption.
  const budget = 2200 - header.length - 4; // 4 for the extra "\n\n" joins below
  const trimmedVehicleDescription = vehicleDescription
    ? vehicleDescription.length > budget ? vehicleDescription.slice(0, Math.max(budget, 0)) + '…' : vehicleDescription
    : null;

  return `${listing.year} ${listing.make} ${listing.model} — ${fmtPrice(listing.price)}`
    + (details ? `\n${details}` : '')
    + (trimmedVehicleDescription ? `\n\n${trimmedVehicleDescription}` : '')
    + `\n\nSee full details & more photos: ${buildListingUrl(listing)}`
    + `\n\n${buildHashtags(listing)}`;
}

async function getAccessToken(): Promise<string | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
  if (!clientKey || !clientSecret || !refreshToken) return null;

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    log.error('TikTok token refresh failed', new Error(data.error_description ?? `HTTP ${res.status}`));
    return null;
  }
  return data.access_token as string;
}

// TikTok requires posting only with a privacy level the creator's account
// actually supports -- posting with an unsupported one fails outright, and
// silently substituting a different one than what was asked for (e.g.
// quietly downgrading a public post to private) would be worse than just
// failing loudly, so this returns null (treated as failure) rather than a
// fallback level when the requested one isn't available.
async function getAvailablePrivacyLevels(accessToken: string): Promise<string[] | null> {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== 'ok') return null;
  return data.data?.privacy_level_options ?? null;
}

// Designed to never throw: a TikTok post failure must never break the
// existing Facebook/Instagram/YouTube posting it's called alongside
// (fire-and-forget) from app/api/video-pipeline/complete/route.ts. Returns
// whether the post actually succeeded, so callers can record
// tiktok_posted_at.
//
// Unlike YouTube (which requires pushing video bytes), TikTok's Content
// Posting API supports PULL_FROM_URL -- since the domain hosting videoUrl
// is already verified with TikTok, this just hands over the URL and lets
// TikTok's own servers fetch it, same shape as the Facebook/Instagram
// integrations.
export async function postListingReelToTikTok(
  listing: ListingPostInput,
  videoUrl: string,
  privacyLevel: string = 'PUBLIC_TO_EVERYONE'
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      log.info('TikTok post skipped — TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET/TIKTOK_REFRESH_TOKEN not configured');
      return false;
    }

    const availableLevels = await getAvailablePrivacyLevels(accessToken);
    if (!availableLevels) {
      log.error('TikTok post failed to query creator info', new Error('creator_info/query failed'), { listingId: listing.id });
      return false;
    }
    // A missing privacy level here is expected, not exceptional, while our
    // Content Posting API audit is pending (unaudited apps can't post
    // PUBLIC_TO_EVERYONE) -- warn (Axiom only) rather than error (which pages
    // via Sentry), so the daily automated retries don't alert on a known,
    // already-tracked condition. This naturally stops firing the moment the
    // audit is approved and the requested level becomes available.
    if (!availableLevels.includes(privacyLevel)) {
      log.warn(
        'TikTok post skipped — requested privacy level not available for this creator (Content Posting API audit likely still pending)',
        { listingId: listing.id, requestedLevel: privacyLevel, availableLevels: availableLevels.join(',') }
      );
      return false;
    }

    // FILE_UPLOAD, not PULL_FROM_URL -- the rendered video is hosted on
    // Supabase Storage, a domain we don't own and can't verify with TikTok,
    // so TikTok can't be handed the URL to fetch itself. Same shape as the
    // YouTube integration: download the bytes, then push them.
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      log.error('TikTok post failed to fetch source video', new Error(`HTTP ${videoRes.status}`), { listingId: listing.id });
      return false;
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: {
          title: buildCaption(listing),
          privacy_level: privacyLevel,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoBuffer.length,
          chunk_size: videoBuffer.length,
          total_chunk_count: 1,
        },
      }),
    });
    const initData = await initRes.json();

    // Same reasoning as the privacy-level check above: while unaudited, TikTok
    // rejects every real init attempt (unaudited_client_can_only_post_to_private_accounts,
    // and -- once enough attempts stack up in a day -- a separate "exceeded
    // the number of videos" limit). Both are the same known, already-tracked
    // condition, not a new bug each time -- warn rather than error.
    if (!initRes.ok || initData.error?.code !== 'ok' || !initData.data?.publish_id || !initData.data?.upload_url) {
      log.warn('TikTok post init failed (Content Posting API audit likely still pending)', { listingId: listing.id, error: initData.error?.message ?? `HTTP ${initRes.status}` });
      return false;
    }

    const uploadRes = await fetch(initData.data.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text().catch(() => '');
      log.error('TikTok video upload failed', new Error(errBody || `HTTP ${uploadRes.status}`), { listingId: listing.id });
      return false;
    }

    log.info('TikTok post succeeded', { listingId: listing.id, publishId: initData.data.publish_id });
    return true;
  } catch (err) {
    log.error('postListingReelToTikTok threw', err instanceof Error ? err : new Error(String(err)), { listingId: listing.id });
    return false;
  }
}
