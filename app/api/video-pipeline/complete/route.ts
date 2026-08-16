import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { postListingReelToFacebook, postListingReelToInstagram, deleteFacebookReel, deleteInstagramMedia } from '@/lib/facebook/postToPage';
import { postListingReelToYouTube, deleteYouTubeVideo } from '@/lib/youtube/postShort';
import { postListingReelToTikTok } from '@/lib/tiktok/postShort';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/video-pipeline/complete');

// YouTube uploads require downloading the rendered video and re-uploading it
// to Google (unlike Facebook/Instagram, which just fetch a URL we hand them),
// which takes longer than Vercel's default function timeout allows.
export const maxDuration = 60;

// A platform's post is stale (needs replacing, not just filling in) when it
// was posted before the listing's price last dropped. Deliberately per
// platform, not one shared flag for the whole listing: if Facebook and
// YouTube successfully refresh but Instagram fails, Instagram's *_posted_at
// stays at its old value and keeps comparing stale on the next run -- it
// gets retried on its own without Facebook/YouTube (already caught up)
// being needlessly re-posted and re-deleted again alongside it.
function isStale(postedAt: string | null, priceDroppedAt: string | null): boolean {
  if (!priceDroppedAt || !postedAt) return false; // no drop in progress, or never posted yet (handled as a normal missing-platform post, not a refresh)
  return new Date(postedAt).getTime() < new Date(priceDroppedAt).getTime();
}

// POST /api/video-pipeline/complete — called by the InterServer VPS once it
// finishes (or fails) building a listing's video. Authenticated the same way
// as the cron routes (a shared secret, not a user session) since the caller
// is the VPS, not a browser. On success, posts the finished video to
// whichever of Facebook/Instagram/YouTube/TikTok this listing doesn't
// already have -- each platform is checked independently via its own
// `*_posted_at` column, so this route is safe to call both for a brand-new
// listing (nothing posted yet) and for a re-render triggered to catch a
// listing up on a platform it's missing (e.g. an older listing that
// predates YouTube/TikTok support) without re-posting to platforms it
// already has. On failure, just logs it -- same tolerance as the existing
// photo-posting pipeline, a listing that fails to get a video simply
// doesn't get one.
//
// REFRESH: when listing.price_dropped_at is set (see the price-drop
// detection in app/api/listings/[id]/route.ts and the dealer dashboard's
// own price edit), Facebook/Instagram/YouTube are each independently
// checked via isStale() above -- a stale platform is force-reposted and its
// previous post deleted afterward; a platform that's already caught up
// (posted after the drop) is left alone. There is no "refresh done" flag to
// clear: once every platform's *_posted_at is newer than price_dropped_at,
// they simply stop comparing stale on their own, so the batch job
// (app/api/admin/video-price-refresh) naturally stops selecting this
// listing without any extra bookkeeping here. TikTok is deliberately
// excluded from refresh entirely -- its posting doesn't reliably work yet
// (pending TikTok's own Content Posting API audit) -- and keeps its normal
// "post only if missing" behavior unconditionally.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.VIDEO_PIPELINE_CALLBACK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listingId, success, videoUrl, error } = await request.json();
  if (!listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 });
  }

  if (!success || !videoUrl) {
    log.warn('Video pipeline job reported failure', { listingId, error });
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('listings')
    .select('id, title, make, model, year, price, slug, images, mileage, condition, location, state, description, description_paragraphs, hobby_segment, body_style, reel_posted_at, instagram_posted_at, youtube_posted_at, youtube_video_id, tiktok_posted_at, facebook_reel_id, instagram_media_id, price_dropped_at')
    .eq('id', listingId)
    .single();

  if (!listing) {
    log.warn('Video pipeline callback for unknown listing', { listingId });
    return NextResponse.json({ ok: true });
  }

  const fbStale = isStale(listing.reel_posted_at, listing.price_dropped_at);
  const igStale = isStale(listing.instagram_posted_at, listing.price_dropped_at);
  const ytStale = isStale(listing.youtube_posted_at, listing.price_dropped_at);

  let fbSuccess = Boolean(listing.reel_posted_at) && !fbStale;
  if (!listing.reel_posted_at || fbStale) {
    const fbVideoId = await postListingReelToFacebook(listing, videoUrl).catch(() => null);
    fbSuccess = Boolean(fbVideoId);
    if (fbVideoId) {
      if (fbStale && listing.facebook_reel_id) {
        await deleteFacebookReel(listing.facebook_reel_id).catch(() => {});
      }
      await admin.from('listings').update({ reel_posted_at: new Date().toISOString(), facebook_reel_id: fbVideoId }).eq('id', listingId);
    }
  }

  // Awaited (not fire-and-forget) so the *_posted_at write always completes
  // before the function returns -- Vercel can freeze/tear down execution
  // right after the response is sent, which was silently dropping these
  // updates even when the underlying post succeeded. Run in parallel so the
  // combined wait stays within maxDuration instead of summing three uploads.
  const postAndRecordInstagram = async (): Promise<boolean> => {
    if (listing.instagram_posted_at && !igStale) return true;
    const mediaId = await postListingReelToInstagram(listing, videoUrl).catch(() => null);
    if (mediaId) {
      if (igStale && listing.instagram_media_id) {
        await deleteInstagramMedia(listing.instagram_media_id).catch(() => {});
      }
      await admin.from('listings').update({ instagram_posted_at: new Date().toISOString(), instagram_media_id: mediaId }).eq('id', listingId);
    }
    return Boolean(mediaId);
  };

  const postAndRecordYouTube = async (): Promise<boolean> => {
    if (listing.youtube_posted_at && !ytStale) return true;
    const videoId = await postListingReelToYouTube(listing, videoUrl).catch(() => null);
    if (videoId) {
      if (ytStale && listing.youtube_video_id) {
        await deleteYouTubeVideo(listing.youtube_video_id).catch(() => {});
      }
      await admin.from('listings').update({ youtube_posted_at: new Date().toISOString(), youtube_video_id: videoId }).eq('id', listingId);
    }
    return Boolean(videoId);
  };

  const postAndRecordTikTok = async (): Promise<boolean> => {
    if (listing.tiktok_posted_at) return true; // never refreshed -- see the REFRESH note above
    const posted = await postListingReelToTikTok(listing, videoUrl, process.env.TIKTOK_DEMO_PRIVACY_LEVEL || 'PUBLIC_TO_EVERYONE').catch(() => false);
    if (posted) {
      await admin.from('listings').update({ tiktok_posted_at: new Date().toISOString() }).eq('id', listingId);
    }
    return posted;
  };

  const [igSuccess, ytSuccess, ttSuccess] = await Promise.all([
    postAndRecordInstagram(),
    postAndRecordYouTube(),
    postAndRecordTikTok(),
  ]);

  return NextResponse.json({ ok: true, fbSuccess, igSuccess, ytSuccess, ttSuccess });
}
