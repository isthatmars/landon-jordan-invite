"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type YoutubeHandle = {
  load: (videoId: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  replay: () => void;
  mute: (muted: boolean) => void;
  seek: (seconds: number) => void;
  readTime: () => { current: number; duration: number };
};

type Player = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => Player;
      PlayerState: { ENDED: number; PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | null = null;

function loadYoutubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (!apiReady) {
    apiReady = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    });
  }
  return apiReady;
}

export const YoutubeScreen = forwardRef<
  YoutubeHandle,
  {
    videoId: string;
    title: string;
    onEnded?: () => void;
    onPlayingChange?: (playing: boolean) => void;
  }
>(function YoutubeScreen({ videoId, title, onEnded, onPlayingChange }, ref) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const queued = useRef(videoId);
  const ended = useRef(onEnded);
  const playingChange = useRef(onPlayingChange);
  ended.current = onEnded;
  playingChange.current = onPlayingChange;

  useImperativeHandle(ref, () => ({
    load(id: string) {
      queued.current = id;
      player.current?.loadVideoById(id);
    },
    play() {
      player.current?.playVideo();
    },
    pause() {
      player.current?.pauseVideo();
    },
    stop() {
      player.current?.seekTo(0, true);
      player.current?.pauseVideo();
    },
    replay() {
      player.current?.seekTo(0, true);
      player.current?.playVideo();
    },
    mute(muted: boolean) {
      if (muted) player.current?.mute();
      else player.current?.unMute();
    },
    seek(seconds: number) {
      player.current?.seekTo(seconds, true);
    },
    readTime() {
      return {
        current: player.current?.getCurrentTime?.() || 0,
        duration: player.current?.getDuration?.() || 0,
      };
    },
  }));

  useEffect(() => {
    let cancelled = false;
    void loadYoutubeApi().then(() => {
      if (cancelled || !mount.current || !window.YT || player.current) return;
      player.current = new window.YT.Player(mount.current, {
        videoId: queued.current,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event: { data: number }) => {
            const state = window.YT?.PlayerState;
            if (!state) return;
            if (event.data === state.ENDED) ended.current?.();
            playingChange.current?.(event.data === state.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    if (!videoId) return;
    queued.current = videoId;
    player.current?.loadVideoById(videoId);
  }, [videoId]);

  return <div ref={mount} className="h-full w-full" aria-label={title} />;
});
