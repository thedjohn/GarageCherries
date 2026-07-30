import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { postListingReelToFacebook, postListingReelToInstagram } from '@/lib/facebook/postToPage';
import { postListingReelToYouTube } from '@/lib/youtube/postShort';
import { postListingReelToTikTok } from '@/lib/tiktok/postShort';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/video-pipeline/complete');

// YouTube uploads require downloading the rendered video and re-uploading it
// to Google (unlike Facebook/Instagram, which just fetch a URL we hand them),
// which takes longer than Vercel's default function timeout allows.
export const maxDuration = 60;

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
    .select('id, title, make, model, year, price, slug, images, mileage, condition, location, state, description, description_paragraphs, hobby_segment, body_style, reel_posted_at, instagram_posted_at, youtube_posted_at, tiktok_posted_at')
    .eq('id', listingId)
    .single();

  if (!listing) {
    log.warn('Video pipeline callback for unknown listing', { listingId });
    return NextResponse.json({ ok: true });
  }

  let fbSuccess = Boolean(listing.reel_posted_at);
  if (!listing.reel_posted_at) {
    fbSuccess = await postListingReelToFacebook(listing, videoUrl);
    if (fbSuccess) {
      await admin.from('listings').update({ reel_posted_at: new Date().toISOString() }).eq('id', listingId);
    }
  }

  if (!listing.instagram_posted_at) {
    postListingReelToInstagram(listing, videoUrl)
      .then(success => { if (success) admin.from('listings').update({ instagram_posted_at: new Date().toISOString() }).eq('id', listingId); })
      .catch(() => {});
  }
  if (!listing.youtube_posted_at) {
    postListingReelToYouTube(listing, videoUrl)
      .then(success => { if (success) admin.from('listings').update({ youtube_posted_at: new Date().toISOString() }).eq('id', listingId); })
      .catch(() => {});
  }
  if (!listing.tiktok_posted_at) {
    postListingReelToTikTok(listing, videoUrl)
      .then(success => { if (success) admin.from('listings').update({ tiktok_posted_at: new Date().toISOString() }).eq('id', listingId); })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, fbSuccess });
}
