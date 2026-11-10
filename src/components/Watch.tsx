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
    <section id="watch" data-youtube-id={now?.youtubeId ?? ""} className="scene-section relative min-h-[560px] overflow-hidden sm:min-h-[700px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/scene-watch-table.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_46%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#05010f] to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[560px] w-full max-w-[1000px] items-end px-3 pb-[28%] sm:min-h-[700px] sm:px-6 sm:pb-[24%]">
        <div className="flex w-full items-end justify-center gap-2 sm:gap-5">
        <div className="relative w-[48%] max-w-[480px]">
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

        <div className="relative w-[30%] pb-2 text-left">
          <h2 className="neon-script-lg text-[1.35rem] leading-[0.9] min-[640px]:text-[2.4rem]">{script}</h2>
          <GreenSwoosh className="mt-1 h-3 w-28 min-[640px]:w-40" />
          <button
            type="button"
            className="btn-pink-outline mt-4 inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em]"
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
