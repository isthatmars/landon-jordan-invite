"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { crtScreen } from "@/lib/cutouts";
import { usePlayback } from "./Playback";
import { YoutubeScreen, type YoutubeHandle } from "./YoutubeScreen";

export function Watch({ headline }: { headline: string }) {
  const {
    videos,
    now,
    playing,
    playSerial,
    registerPlayer,
    stepVideo,
    toggleCurrent,
    replay,
    tuneVideo,
    mute,
    onEnded,
    onPlayingChange,
  } = usePlayback();
  const [browsing, setBrowsing] = useState(true);
  const [muted, setMuted] = useState(false);
  const [staticOn, setStaticOn] = useState(false);
  const skipStatic = useRef(true);
  const bindPlayer = useCallback((handle: YoutubeHandle | null) => {
    registerPlayer(handle);
  }, [registerPlayer]);

  useEffect(() => {
    if (skipStatic.current) {
      skipStatic.current = false;
      return;
    }
    setStaticOn(true);
    const timer = window.setTimeout(() => setStaticOn(false), 420);
    return () => window.clearTimeout(timer);
  }, [playSerial]);

  useEffect(() => {
    mute(muted);
  }, [muted, now?.youtubeId, mute]);

  const currentId = now?.youtubeId ?? "";

  return (
    <section id="watch" data-youtube-id={currentId} className="scene-section relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/scene-watch-table.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05010f] via-[#05010f33] to-[#05010f]" />

      <div className="relative z-10 mx-auto grid max-w-[1100px] items-center gap-8 px-3 py-16 sm:px-5 min-[720px]:grid-cols-[1.15fr_0.85fr] min-[720px]:py-20">
        <div className="relative mx-auto w-full max-w-[520px]">
          <div data-testid="tv-screen" className="absolute z-[1] overflow-hidden bg-black" style={crtScreen}>
            {now?.youtubeId ? (
              <YoutubeScreen
                ref={bindPlayer}
                videoId={now.youtubeId}
                title={`${now.artist} — ${now.title}`}
                onEnded={onEnded}
                onPlayingChange={onPlayingChange}
              />
            ) : null}
            {staticOn ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 animate-pulse bg-[repeating-linear-gradient(0deg,#111_0px,#111_2px,#333_3px)] opacity-80"
                aria-hidden
              />
            ) : null}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-crt-front.png"
            alt="Wood CRT television"
            className="pointer-events-none relative z-10 block h-auto w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.6)]"
            draggable={false}
          />
        </div>

        <div>
          <h2 className="neon-script-lg mb-3 text-4xl leading-[0.95] sm:text-5xl">{headline}</h2>
          <p className="mb-4 max-w-md text-sm text-violet-100">
            The party mix plays here. Pick a tape and this screen follows it.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => stepVideo(-1)}>
              ⏮ BACK
            </button>
            <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => replay("videos")}>
              ↺ REPLAY
            </button>
            <button type="button" className="btn-green text-sm" onClick={toggleCurrent}>
              {playing ? "❚❚ PAUSE" : "▶ PLAY"}
            </button>
            <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => stepVideo(1)}>
              NEXT ⏭
            </button>
            <button
              type="button"
              className="btn-pink-outline px-3 py-2 text-xs"
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? "UNMUTE" : "MUTE"}
            </button>
          </div>
          <button
            type="button"
            className="btn-pink-outline inline-flex items-center gap-2 text-sm font-bold tracking-widest"
            onClick={() => setBrowsing((value) => !value)}
          >
            ▶ BROWSE VIDEOS
          </button>
          {browsing ? (
            <ul className="mt-4 max-h-80 space-y-1 overflow-auto">
              {videos.map((video) => (
                <li key={video.id}>
                  <button
                    type="button"
                    data-youtube-id={video.youtubeId}
                    onClick={() => tuneVideo(video)}
                    className={`w-full border-b px-1 py-2 text-left text-sm ${
                      currentId === video.youtubeId
                        ? "border-neon-pink text-neon-pink"
                        : "border-white/15 text-white"
                    }`}
                  >
                    <span className="font-semibold">{video.title}</span>
                    <span className="block text-xs text-violet-300">{video.artist}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
