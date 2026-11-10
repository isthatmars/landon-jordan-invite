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
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05010f] via-[#05010f33] to-[#05010f]" />

      <div className="relative z-10 mx-auto grid max-w-[1100px] items-center gap-4 px-3 py-8 sm:px-5 min-[640px]:grid-cols-[1.15fr_0.85fr] min-[640px]:py-10">
        <div className="relative mx-auto w-full max-w-[520px]">
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
          <img
            src="/images/prop-crt-front.png"
            alt="Wood CRT television"
            className="pointer-events-none relative z-10 block h-auto w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.6)]"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-vinyl-stack.png"
            alt=""
            className="pointer-events-none absolute -left-1 bottom-[-4%] z-[12] w-[24%] drop-shadow-xl"
            draggable={false}
          />
        </div>

        <div className="relative text-center min-[640px]:pb-20 min-[640px]:text-left">
          <h2 className="neon-script-lg text-[2.35rem] leading-[0.92] sm:text-5xl">{script}</h2>
          <GreenSwoosh className="mx-auto mt-1 h-3 w-40 min-[640px]:mx-0" />
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
            <ul className="mx-auto mt-4 max-h-52 max-w-sm space-y-1 overflow-auto text-left min-[640px]:mx-0">
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-roller-skate.png"
            alt=""
            className="pointer-events-none mx-auto mt-5 w-[42%] max-w-[150px] drop-shadow-2xl min-[640px]:absolute min-[640px]:-right-1 min-[640px]:bottom-0 min-[640px]:mx-0 min-[640px]:mt-0 min-[640px]:w-[46%] min-[640px]:max-w-[190px]"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
