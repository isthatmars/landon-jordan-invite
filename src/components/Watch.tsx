"use client";

import { useEffect, useRef, useState } from "react";
import { crtScreen } from "@/lib/cutouts";
import { GreenSwoosh } from "./icons";
import { usePlayback } from "./Playback";
import { YoutubeScreen } from "./YoutubeScreen";

export function Watch({ headline }: { headline: string }) {
  const { videos, now, playing, toggleCurrent, tuneVideo, onEnded, onPlayingChange, registerPlayer } =
    usePlayback();
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
  const words = headline.trim().split(/\s+/).filter(Boolean);
  const lead = words.length > 1 ? words[0] : "";
  const hero = words.length > 1 ? words[1] : words[0] || "";
  const rest = words.length > 2 ? words.slice(2).join(" ") : "";

  return (
    <section
      id="watch"
      data-youtube-id={now?.youtubeId ?? ""}
      className="scene-section watch-scene relative overflow-x-clip overflow-y-visible"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/scene-watch-table.jpg" alt="" className="watch-bg" />
      <div className="watch-shade" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#05010f] to-transparent" />

      <div className="watch-stage">
        <div className="watch-tv">
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
          <div className="floor-contact" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-crt-front.png"
            alt="Wood CRT television"
            className="pointer-events-none relative z-10 block h-auto w-full"
            draggable={false}
          />
        </div>

        <div className="watch-side">
          <div className="watch-copy">
            <h2 className="neon-script-lg watch-title">
              {lead ? <span className="watch-line watch-line-lead">{lead}</span> : null}
              {hero ? <span className="watch-line watch-line-hero">{hero}</span> : null}
              {rest ? <span className="watch-line watch-line-rest">{rest}</span> : null}
            </h2>
            <GreenSwoosh className="watch-swoosh" stroke="#C6FF00" />
            <div className="watch-list" role="region" aria-label="Browse videos">
              <p className="watch-browse-label">Browse Videos</p>
              <ul className="watch-list-items">
                {videos.map((video) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      data-youtube-id={video.youtubeId}
                      onClick={() => tuneVideo(video)}
                      className={`watch-list-item w-full border-b px-1 py-2 text-left text-sm text-white ${
                        now?.youtubeId === video.youtubeId
                          ? "is-current border-white/35"
                          : "border-white/20"
                      }`}
                    >
                      <span className="font-semibold text-white">{video.title}</span>
                      <span className="block text-xs text-white">{video.artist}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="watch-skate">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/prop-roller-skate.png" alt="" draggable={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
