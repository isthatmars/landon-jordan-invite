"use client";

import { useEffect, useRef, useState } from "react";
import { crtScreen } from "@/lib/cutouts";
import { GreenSwoosh } from "./icons";
import { usePlayback } from "./Playback";
import { YoutubeScreen } from "./YoutubeScreen";

export function Watch({ headline }: { headline: string }) {
  const { videos, now, playing, toggleCurrent, tuneVideo, onEnded, onPlayingChange, registerPlayer } =
    usePlayback();
  const [browsing, setBrowsing] = useState(false);
  const [staticOn, setStaticOn] = useState(false);
  const skipStatic = useRef(true);

  useEffect(() => {
    if (skipStatic.current) {
      skipStatic.current = false;
      return;
    }
    setStaticOn(true);
    const timer = window.setTimeout(() => setStaticOn(false), 460);
    return () => window.clearTimeout(timer);
  }, [now?.youtubeId]);
  const lines = headline.trim().split(/\s+/);
  const script =
    lines.length >= 3 ? (
      <>
        {lines[0]}
        <br />
        {lines[1]}
        <br />
        {lines.slice(2).join(" ")}
      </>
    ) : (
      headline
    );

  return (
    <section id="watch" data-youtube-id={now?.youtubeId ?? ""} className="scene-section relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/scene-watch-table.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_62%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#05010f] to-transparent" />

      <div className="watch-stage relative z-10 mx-auto flex w-full max-w-[1180px] items-end px-4 py-6 sm:px-4 sm:py-6">
        <div className="watch-row flex w-full flex-col items-center justify-center gap-3 md:flex-row md:items-end md:gap-4">
        <div className="watch-tv relative order-2 w-[86%] max-w-[680px] md:order-1 md:w-[58%]">
          <div className="crt-screen-light" aria-hidden />
          <div
            data-testid="tv-screen"
            data-screen="crt"
            className="crt-bezel-glow absolute z-[1] overflow-hidden bg-black"
            style={crtScreen}
          >
            {now?.youtubeId ? (
              <YoutubeScreen
                ref={registerPlayer}
                videoId={now.youtubeId}
                title={`${now.artist} — ${now.title}`}
                onEnded={onEnded}
                onPlayingChange={onPlayingChange}
              />
            ) : null}
            {!playing && (
              <button
                type="button"
                className="absolute inset-0 z-10 grid place-items-center"
                aria-label={now ? `Play ${now.artist} — ${now.title}` : "Play video"}
                onClick={toggleCurrent}
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/92 shadow-[0_8px_24px_#000a]">
                  <span
                    className="ml-1 block h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-[#1a1028]"
                    aria-hidden
                  />
                </span>
              </button>
            )}
            <div className="crt-scanlines" aria-hidden />
            <div className={`crt-static${staticOn ? " is-on" : ""}`} aria-hidden />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="floor-contact" />
          <img
            src="/images/prop-crt-front.png"
            alt="Wood CRT television"
            className="pointer-events-none relative z-10 block h-auto w-full"
            draggable={false}
          />
        </div>

        <div className="watch-copy relative order-1 w-full pb-1 text-center md:order-2 md:w-[28%] md:pb-2 md:text-left">
          <h2 className="neon-script-lg text-[34px] leading-[0.92] sm:text-[3rem]">{script}</h2>
          <GreenSwoosh className="mx-auto mt-1 h-3 w-28 md:mx-0 min-[640px]:w-40" />
          <button
            type="button"
            className="btn-pink-outline mt-3 inline-flex min-h-12 items-center gap-2 whitespace-nowrap px-5 py-3 text-base font-bold tracking-[0.14em] md:mt-4 md:min-h-0 md:px-4 md:py-1.5 md:text-xs md:tracking-[0.16em]"
            aria-expanded={browsing}
            onClick={() => setBrowsing((value) => !value)}
          >
            <span aria-hidden>▶</span>
            BROWSE VIDEOS
          </button>
          {browsing ? (
            <ul className="mt-4 max-h-40 space-y-1 overflow-auto text-left">
              {videos.map((video) => (
                <li key={video.id}>
                  <button
                    type="button"
                    data-youtube-id={video.youtubeId}
                    onClick={() => tuneVideo(video)}
                    className={`w-full border-b px-1 py-2 text-left text-sm ${
                      now?.youtubeId === video.youtubeId
                        ? "border-[#ff4fd8] text-[#ff4fd8]"
                        : "border-white/15 text-white"
                    }`}
                  >
                    <span className="font-semibold">{video.title}</span>
                    <span className="block text-xs text-white/60">{video.artist}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="watch-skate relative order-3 w-[28%] max-w-[120px] shrink-0 md:w-[18%] md:max-w-[170px]">
          <div className="floor-contact" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-roller-skate.png"
            alt=""
            className="relative block h-auto w-full"
            draggable={false}
          />
        </div>
        </div>
      </div>
    </section>
  );
}
