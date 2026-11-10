"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { holdScroll } from "@/lib/holdScroll";

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
  getIframe?: () => HTMLIFrameElement;
  destroy: () => void;
};

type Command =
  | { op: "load"; id: string }
  | { op: "play" }
  | { op: "pause" }
  | { op: "stop" }
  | { op: "replay" }
  | { op: "seek"; seconds: number }
  | { op: "mute"; muted: boolean };

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => Player;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
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

function fitIframe(player: Player) {
  const iframe = player.getIframe?.();
  if (!iframe) return;
  iframe.tabIndex = -1;
  iframe.style.position = "absolute";
  iframe.style.inset = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  if (document.activeElement === iframe) iframe.blur();
}

function apply(player: Player, cmd: Command, loadedAt: { current: number }) {
  if (cmd.op === "load" || cmd.op === "play" || cmd.op === "replay" || cmd.op === "stop" || cmd.op === "seek") {
    holdScroll();
  }
  if (cmd.op === "load") {
    loadedAt.current = Date.now();
    player.loadVideoById(cmd.id);
  } else if (cmd.op === "play") {
    player.playVideo();
  } else if (cmd.op === "pause") {
    player.pauseVideo();
  } else if (cmd.op === "stop") {
    player.seekTo(0, true);
    player.pauseVideo();
  } else if (cmd.op === "replay") {
    loadedAt.current = Date.now();
    player.seekTo(0, true);
    player.playVideo();
  } else if (cmd.op === "seek") {
    player.seekTo(cmd.seconds, true);
  } else if (cmd.op === "mute") {
    if (cmd.muted) player.mute();
    else player.unMute();
  }
  fitIframe(player);
  window.setTimeout(() => fitIframe(player), 0);
}

export const YoutubeScreen = forwardRef<
  YoutubeHandle,
  {
    videoId: string;
    title: string;
    /** Increments when a tape or the TV should start this video. 0 cues only. */
    playToken?: number;
    onEnded?: () => void;
    onPlayingChange?: (playing: boolean) => void;
  }
>(function YoutubeScreen({ videoId, title, playToken = 0, onEnded, onPlayingChange }, ref) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const ready = useRef(false);
  const pending = useRef<Command[]>([]);
  const queued = useRef(videoId);
  const loadedAt = useRef(0);
  const ended = useRef(onEnded);
  const playingChange = useRef(onPlayingChange);
  queued.current = videoId;
  ended.current = onEnded;
  playingChange.current = onPlayingChange;

  const dispatch = (cmd: Command) => {
    if (cmd.op === "load") {
      queued.current = cmd.id;
      pending.current = pending.current.filter((item) => item.op !== "load");
    }
    if (!ready.current || !player.current) {
      pending.current.push(cmd);
      return;
    }
    apply(player.current, cmd, loadedAt);
  };
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useImperativeHandle(
    ref,
    () => ({
      load(id: string) {
        dispatchRef.current({ op: "load", id });
      },
      play() {
        dispatchRef.current({ op: "play" });
      },
      pause() {
        dispatchRef.current({ op: "pause" });
      },
      stop() {
        dispatchRef.current({ op: "stop" });
      },
      replay() {
        dispatchRef.current({ op: "replay" });
      },
      mute(muted: boolean) {
        dispatchRef.current({ op: "mute", muted });
      },
      seek(seconds: number) {
        dispatchRef.current({ op: "seek", seconds });
      },
      readTime() {
        return {
          current: player.current?.getCurrentTime?.() || 0,
          duration: player.current?.getDuration?.() || 0,
        };
      },
    }),
    [],
  );

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
          controls: 0,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            const created = player.current;
            if (cancelled || !created) return;
            ready.current = true;
            fitIframe(created);
            const cmds = pending.current.splice(0, pending.current.length);
            for (const cmd of cmds) apply(created, cmd, loadedAt);
          },
          onStateChange: (event: { data: number }) => {
            const created = player.current;
            const state = window.YT?.PlayerState;
            if (!state || !created) return;
            if (event.data === state.ENDED) {
              if (Date.now() - loadedAt.current < 800) return;
              ended.current?.();
              return;
            }
            if (event.data === state.PLAYING) {
              fitIframe(created);
              playingChange.current?.(true);
            } else if (event.data === state.PAUSED) {
              playingChange.current?.(false);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      ready.current = false;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playToken) return;
    dispatchRef.current({ op: "load", id: videoId });
  }, [playToken, videoId]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={mount} className="relative h-full w-full overflow-hidden" aria-label={title} />
    </div>
  );
});
