"use client";

import type { Track, VideoItem } from "@/lib/types";
import { BackToTop } from "./BackToTop";
import { Mixtape } from "./Mixtape";
import { PlaybackProvider } from "./Playback";
import { Watch } from "./Watch";

/** One player shared by the cassette deck and the CRT. */
export function PartyPlayback({
  mixtapeHeadline,
  watchHeadline,
  tracks,
  videos,
}: {
  mixtapeHeadline: string;
  watchHeadline: string;
  tracks: Track[];
  videos: VideoItem[];
}) {
  return (
    <PlaybackProvider tracks={tracks} videos={videos}>
      <Mixtape headline={mixtapeHeadline} />
      <Watch headline={watchHeadline} />
      <BackToTop />
    </PlaybackProvider>
  );
}
