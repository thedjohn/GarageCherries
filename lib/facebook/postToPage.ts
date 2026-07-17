import { createLogger } from '@/lib/logger';

const log = createLogger('lib/facebook');

// Graph API version — Facebook deprecates versions ~2 years after release.
// Verify this is still current when wiring up the real Page Access Token.
const GRAPH_VERSION = 'v21.0';

function toSegment(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

async function postToPage(path: string, params: Record<string, string>): Promise<boolean> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    log.info('Facebook Page post skipped — FACEBOOK_PAGE_ID/FACEBOOK_PAGE_ACCESS_TOKEN not configured');
    return false;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/${path}`;
  const body = new URLSearchParams({ ...params, access_token: token });

  const res = await fetch(url, { method: 'POST', body });
  const data = await res.json();
  if (!res.ok || data.error) {
    log.error('Facebook Page post failed', new Error(data.error?.message ?? `HTTP ${res.status}`), { path });
    return false;
  }
  log.info('Facebook Page post succeeded', { path, postId: data.post_id ?? data.id ?? '' });
  return true;
}

interface ListingPostInput {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  slug: string;
  images: string[] | null;
}

// Designed to never throw: a Facebook API failure must never break listing/event creation.
// Returns whether the post actually succeeded, so callers can record it (e.g. fb_posted_at).
export async function postListingToFacebook(listing: ListingPostInput): Promise<boolean> {
  const url = `https://www.garagecherries.com/listings/${toSegment(listing.make)}/${toSegment(listing.model)}/${listing.id}/${listing.slug}`;
  const caption = `${listing.year} ${listing.make} ${listing.model} — ${fmtPrice(listing.price)}\n\nView details: ${url}`;

  try {
    if (listing.images?.[0]) {
      return await postToPage('photos', { url: listing.images[0], caption });
    } else {
      return await postToPage('feed', { message: caption, link: url });
    }
  } catch (err) {
    log.error('postListingToFacebook threw', err instanceof Error ? err : new Error(String(err)), { listingId: listing.id });
    return false;
  }
}

interface EventPostInput {
  slug: string;
  name: string;
  date: string;
  location: string;
  state: string;
}

export async function postEventToFacebook(event: EventPostInput) {
  const url = `https://www.garagecherries.com/events/${event.slug}`;
  const dateStr = new Date(`${event.date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const message = `${event.name}\n${dateStr} — ${event.location}, ${event.state}\n\nDetails: ${url}`;

  try {
    await postToPage('feed', { message, link: url });
  } catch (err) {
    log.error('postEventToFacebook threw', err instanceof Error ? err : new Error(String(err)), { eventSlug: event.slug });
  }
}
