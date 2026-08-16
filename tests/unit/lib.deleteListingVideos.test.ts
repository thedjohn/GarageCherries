import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDeleteYouTubeVideo, mockDeleteFacebookReel, mockDeleteInstagramMedia, mockFrom, mockUpdate, mockUpdateEq } = vi.hoisted(() => ({
  mockDeleteYouTubeVideo: vi.fn(),
  mockDeleteFacebookReel: vi.fn(),
  mockDeleteInstagramMedia: vi.fn(),
  mockFrom: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
}));

vi.mock('@/lib/youtube/postShort', () => ({ deleteYouTubeVideo: mockDeleteYouTubeVideo }));
vi.mock('@/lib/facebook/postToPage', () => ({ deleteFacebookReel: mockDeleteFacebookReel, deleteInstagramMedia: mockDeleteInstagramMedia }));

import { deleteListingVideos } from '@/lib/deleteListingVideos';

function makeAdmin() {
  mockFrom.mockImplementation((table: string) => {
    if (table !== 'listings') throw new Error(`Unexpected table: ${table}`);
    return { update: mockUpdate.mockReturnValue({ eq: mockUpdateEq }) };
  });
  return { from: mockFrom } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteYouTubeVideo.mockResolvedValue(true);
  mockDeleteFacebookReel.mockResolvedValue(true);
  mockDeleteInstagramMedia.mockResolvedValue(true);
  mockUpdateEq.mockResolvedValue({ error: null });
});

describe('deleteListingVideos', () => {
  it('deletes on every platform that has a stored ID', async () => {
    const admin = makeAdmin();
    await deleteListingVideos(admin, 'l1', { youtube_video_id: 'yt-1', facebook_reel_id: 'fb-1', instagram_media_id: 'ig-1' });

    expect(mockDeleteYouTubeVideo).toHaveBeenCalledWith('yt-1');
    expect(mockDeleteFacebookReel).toHaveBeenCalledWith('fb-1');
    expect(mockDeleteInstagramMedia).toHaveBeenCalledWith('ig-1');
  });

  it('skips a platform entirely when it has no stored ID', async () => {
    const admin = makeAdmin();
    await deleteListingVideos(admin, 'l1', { youtube_video_id: 'yt-1', facebook_reel_id: null, instagram_media_id: null });

    expect(mockDeleteYouTubeVideo).toHaveBeenCalled();
    expect(mockDeleteFacebookReel).not.toHaveBeenCalled();
    expect(mockDeleteInstagramMedia).not.toHaveBeenCalled();
  });

  it('clears only the IDs that were successfully deleted', async () => {
    const admin = makeAdmin();
    mockDeleteFacebookReel.mockResolvedValue(false); // Facebook delete fails

    await deleteListingVideos(admin, 'l1', { youtube_video_id: 'yt-1', facebook_reel_id: 'fb-1', instagram_media_id: 'ig-1' });

    expect(mockUpdate).toHaveBeenCalledWith({ youtube_video_id: null, instagram_media_id: null });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'l1');
  });

  it('does not touch the listing at all when nothing had an ID to begin with', async () => {
    const admin = makeAdmin();
    await deleteListingVideos(admin, 'l1', {});

    expect(mockDeleteYouTubeVideo).not.toHaveBeenCalled();
    expect(mockDeleteFacebookReel).not.toHaveBeenCalled();
    expect(mockDeleteInstagramMedia).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does not throw when every delete call fails', async () => {
    const admin = makeAdmin();
    mockDeleteYouTubeVideo.mockResolvedValue(false);
    mockDeleteFacebookReel.mockResolvedValue(false);
    mockDeleteInstagramMedia.mockResolvedValue(false);

    await expect(deleteListingVideos(admin, 'l1', { youtube_video_id: 'yt-1', facebook_reel_id: 'fb-1', instagram_media_id: 'ig-1' })).resolves.not.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does not throw when a delete call itself rejects', async () => {
    const admin = makeAdmin();
    mockDeleteYouTubeVideo.mockRejectedValue(new Error('YouTube API down'));

    await expect(deleteListingVideos(admin, 'l1', { youtube_video_id: 'yt-1' })).resolves.not.toThrow();
  });
});
