import { createLogger } from '@/lib/logger';
import { formatListingPrice } from '@/lib/data';

const log = createLogger('lib/videoPipeline');

interface ListingVideoInput {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  images: string[] | null;
}

// Fire-and-forget, same contract as the Facebook/Instagram posting helpers:
// never throws, a VPS outage or failure must never break listing creation or
// the existing photo-posting flow. This only kicks off video generation --
// the VPS calls back to /api/video-pipeline/complete when it's done, which
// is what actually posts the Reel.
export async function triggerListingVideo(listing: ListingVideoInput): Promise<void> {
  const vpsUrl = process.env.VPS_URL;
  const sharedSecret = process.env.VPS_SHARED_SECRET;
  if (!vpsUrl || !sharedSecret) {
    log.info('Video pipeline trigger skipped — VPS_URL/VPS_SHARED_SECRET not configured');
    return;
  }
  if (!listing.images || listing.images.length < 2) {
    // A single-photo listing is usually a feed that hasn't synced real photos
    // yet -- often just a dealer's own placeholder/branding card (see the
    // McGinty Motorcars incident: a video got built from that one card and
    // was never regenerated once real photos arrived, since only a price
    // drop re-triggers a render, not an images-array change).
    log.info('Video pipeline trigger skipped — fewer than 2 images', { listingId: listing.id, imageCount: listing.images?.length ?? 0 });
    return;
  }

  try {
    const res = await fetch(`${vpsUrl}/build-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sharedSecret}` },
      body: JSON.stringify({
        listingId: listing.id,
        title: `${listing.year} ${listing.make} ${listing.model}`,
        price: formatListingPrice(listing.price),
        images: listing.images,
      }),
    });
    if (!res.ok) {
      log.error('Video pipeline trigger failed', new Error(`HTTP ${res.status}`), { listingId: listing.id });
    }
  } catch (err) {
    log.error('Video pipeline trigger threw', err instanceof Error ? err : new Error(String(err)), { listingId: listing.id });
  }
}
