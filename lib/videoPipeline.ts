import { createLogger } from '@/lib/logger';

const log = createLogger('lib/videoPipeline');

interface ListingVideoInput {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  images: string[] | null;
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
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
  if (!listing.images?.length) {
    log.info('Video pipeline trigger skipped — listing has no images', { listingId: listing.id });
    return;
  }

  try {
    const res = await fetch(`${vpsUrl}/build-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sharedSecret}` },
      body: JSON.stringify({
        listingId: listing.id,
        title: `${listing.year} ${listing.make} ${listing.model}`,
        price: fmtPrice(listing.price),
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
