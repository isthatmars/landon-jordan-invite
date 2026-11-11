import type { VideoItem } from "./types";
import { extractYoutubeId, watchUrl, youtubePosterUrl } from "./youtube";

/** Sync youtubeId + posterUrl from the YouTube URL (or bare id). */
export function normalizeVideoItem(video: VideoItem): VideoItem {
  const fromUrl = extractYoutubeId(video.videoUrl);
  const fromId = extractYoutubeId(video.youtubeId);
  const youtubeId = fromUrl || fromId;
  if (!youtubeId) {
    return {
      ...video,
      youtubeId: "",
      posterUrl: video.posterUrl || "",
    };
  }
  return {
    ...video,
    youtubeId,
    videoUrl: watchUrl(youtubeId),
    posterUrl: youtubePosterUrl(youtubeId),
  };
}

export function normalizeVideos(videos: VideoItem[]): VideoItem[] {
  return videos.map(normalizeVideoItem);
}
