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

// Designed to never throw: a TikTok post failure must never break the
// existing Facebook/Instagram/YouTube posting it's called alongside
// (fire-and-forget) from app/api/video-pipeline/complete/route.ts. Returns
// whether the post actually succeeded, so callers can record
// tiktok_posted_at.
//
// Uses the "Upload to TikTok" (inbox/draft) endpoint, not Direct Post --
// this app isn't audited for Direct Post's UX requirements, and inbox
// uploads land as a draft the creator finishes and publishes themselves
// inside the TikTok app, so none of Direct Post's post_info (privacy_level,
// disable_duet/comment/stitch) applies here; the creator sets all of that
// when they publish it. Trades full automation for not needing the audit.
//
// Unlike YouTube (which requires pushing video bytes), TikTok's Content
// Posting API supports PULL_FROM_URL -- since the domain hosting videoUrl
// is already verified with TikTok, this just hands over the URL and lets
// TikTok's own servers fetch it, same shape as the Facebook/Instagram
// integrations.
export async function postListingReelToTikTok(
  listing: ListingPostInput,
  videoUrl: string
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      log.info('TikTok post skipped — TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET/TIKTOK_REFRESH_TOKEN not configured');
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

    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: {
          title: buildCaption(listing),
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

    // "Queue full" (at most 5 pending drafts within 24h) is expected, not
    // exceptional -- leaving tiktok_posted_at unset (rather than treating
    // this as a hard failure) means the existing hourly backfill job
    // naturally retries once the creator clears a draft, no separate retry
    // logic needed. Any other error code is a real, unexpected problem and
    // still deserves the loud error path below.
    if (initData.error?.code === 'spam_risk_too_many_pending_share') {
      log.warn('TikTok post skipped — creator already has 5 pending drafts, will retry once cleared', { listingId: listing.id });
      return false;
    }
    if (!initRes.ok || initData.error?.code !== 'ok' || !initData.data?.publish_id || !initData.data?.upload_url) {
      log.error('TikTok post init failed', new Error(initData.error?.message ?? `HTTP ${initRes.status}`), { listingId: listing.id });
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
