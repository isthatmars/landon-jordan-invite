"use client";

import { useState } from "react";
import { crtScreen } from "@/lib/cutouts";
import { GreenSwoosh } from "./icons";
import { usePlayback } from "./Playback";
import { YoutubeScreen } from "./YoutubeScreen";

export function Watch({ headline }: { headline: string }) {
  const { videos, now, playing, toggleCurrent, tuneVideo, onEnded, onPlayingChange, registerPlayer } =
    usePlayback();
  const [browsing, setBrowsing] = useState(false);
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

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] items-end px-2 py-3 sm:px-4 sm:py-6">
        <div className="flex w-full items-end justify-center gap-2 sm:gap-4">
        <div className="relative w-[58%] max-w-[680px]">
          <div
            data-testid="tv-screen"
            data-screen="crt"
            className="absolute z-[1] overflow-hidden bg-black"
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

        <div className="relative w-[28%] pb-2 text-left">
          <h2 className="neon-script-lg text-[1.7rem] leading-[0.86] sm:text-[3rem]">{script}</h2>
          <GreenSwoosh className="mt-1 h-3 w-28 min-[640px]:w-40" />
          <button
            type="button"
            className="btn-pink-outline mt-2 inline-flex items-center gap-1 whitespace-nowrap px-2 py-1.5 text-[8px] font-bold tracking-[0.12em] sm:mt-4 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.16em]"
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

        <div className="relative w-[18%] max-w-[170px] shrink-0">
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
