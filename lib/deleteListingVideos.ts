import { createAdminClient } from '@/lib/supabase/server';
import { deleteFacebookReel, deleteInstagramMedia } from '@/lib/facebook/postToPage';
import { deleteYouTubeVideo } from '@/lib/youtube/postShort';

interface VideoIds {
  youtube_video_id?: string | null;
  facebook_reel_id?: string | null;
  instagram_media_id?: string | null;
}

// Deletes a sold listing's posted videos from YouTube/Facebook/Instagram and
// clears the corresponding ID column on each success, so a sold car's video
// doesn't keep advertising it as available indefinitely. Called right when a
// listing is marked sold (both the manual mark-sold route and the dealer
// feed-sync's auto-mark-sold pass) -- deleting is a single lightweight API
// call per platform, unlike the price-refresh feature's re-renders, so this
// runs immediately rather than needing a scheduled/batched job. Never
// throws; intended to be called fire-and-forget, same tolerance as the rest
// of the video pipeline -- a listing that fails to get cleaned up here
// simply keeps its old video up, which is no worse than today's behavior.
// TikTok is not included -- no ID is ever captured for it (its posting
// doesn't reliably work yet), so there's nothing to reference to delete it.
export async function deleteListingVideos(admin: ReturnType<typeof createAdminClient>, listingId: string, ids: VideoIds): Promise<void> {
  const update: Record<string, null> = {};

  if (ids.youtube_video_id) {
    const ok = await deleteYouTubeVideo(ids.youtube_video_id).catch(() => false);
    if (ok) update.youtube_video_id = null;
  }
  if (ids.facebook_reel_id) {
    const ok = await deleteFacebookReel(ids.facebook_reel_id).catch(() => false);
    if (ok) update.facebook_reel_id = null;
  }
  if (ids.instagram_media_id) {
    const ok = await deleteInstagramMedia(ids.instagram_media_id).catch(() => false);
    if (ok) update.instagram_media_id = null;
  }

  if (Object.keys(update).length > 0) {
    void admin.from('listings').update(update).eq('id', listingId);
  }
}
