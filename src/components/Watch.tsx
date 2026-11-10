"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { useLightParallax } from "./Parallax";
import { YoutubeScreen, type YoutubeHandle } from "./YoutubeScreen";

export function Watch({
  headline,
  videos,
}: {
  headline: string;
  videos: VideoItem[];
}) {
  const sorted = [...videos].sort((a, b) => a.sortOrder - b.sortOrder);
  const [active, setActive] = useState(sorted[0] || null);
  const [browsing, setBrowsing] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [staticOn, setStaticOn] = useState(false);
  const screenRef = useRef<YoutubeHandle>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const tuneTo = (video: (typeof sorted)[number]) => {
    setStaticOn(true);
    setActive(video);
    setPlaying(true);
    window.setTimeout(() => setStaticOn(false), 420);
  };

  const changeChannel = (dir: -1 | 1) => {
    if (!sorted.length) return;
    const index = Math.max(0, sorted.findIndex((v) => v.id === active?.id));
    tuneTo(sorted[(index + dir + sorted.length) % sorted.length]);
  };
  const light = useLightParallax();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["-6%", "8%"]);
  const tvY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["8%", "-4%"]);

  return (
    <section
      ref={sectionRef}
      id="watch"
      className="scene-section relative min-h-[100svh] w-full overflow-hidden"
    >
      <motion.div className="absolute inset-[-10%] z-0" style={{ y: bgY }}>
        <Image
          src="/images/scene-watch-table.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05010f] via-transparent to-[#05010f]" />
      </motion.div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-4 py-24 md:grid-cols-[1.1fr_0.9fr] md:px-6">
        <motion.div className="relative" style={{ y: tvY }}>
          <div className="relative mx-auto w-full max-w-lg">
            <Image
              src="/images/prop-crt-tv.png"
              alt="Vintage wood CRT television"
              width={800}
              height={640}
              className="relative z-[2] h-auto w-full drop-shadow-[0_30px_60px_#000c]"
            />
            {/* Screen inset overlay */}
            <div className="absolute left-[14%] right-[14%] top-[18%] bottom-[28%] z-[3] overflow-hidden rounded-sm bg-black crt-scanlines">
              {active?.youtubeId ? (
                <YoutubeScreen
                  ref={screenRef}
                  videoId={active.youtubeId}
                  title={`${active.artist} — ${active.title}`}
                  onEnded={() => changeChannel(1)}
                  onPlayingChange={setPlaying}
                />
              ) : null}
              {staticOn && (
                <div
                  className="absolute inset-0 z-10 animate-pulse bg-[repeating-linear-gradient(0deg,#111_0px,#111_2px,#333_3px)] opacity-80"
                  aria-hidden
                />
              )}
            </div>
            <Image
              src="/images/prop-vinyl-stack.png"
              alt=""
              width={180}
              height={180}
              className="absolute -left-4 bottom-0 z-[1] w-[26%] drop-shadow-xl"
            />
            <Image
              src="/images/prop-roller-skate.png"
              alt=""
              width={200}
              height={200}
              className="absolute -right-2 bottom-[-4%] z-[4] w-[30%] drop-shadow-2xl md:-right-8"
            />
            <Image
              src="/images/remote.jpg"
              alt="80s TV remote"
              width={100}
              height={100}
              className="absolute -right-1 top-[55%] z-[5] w-[18%] rotate-12 rounded-md opacity-95 shadow-lg mix-blend-lighten md:right-[-6%]"
            />
          </div>
        </motion.div>

        <div>
          <h2 className="neon-script-lg mb-4 text-4xl sm:text-5xl">{headline}</h2>
          <p className="mb-4 max-w-md text-sm text-violet-100">
            The party mix: the cassette songs, plus a few more videos in that same lane.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => changeChannel(-1)}>
              ⏮ BACK
            </button>
            <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => screenRef.current?.replay()}>
              ↺ REPLAY
            </button>
            <button
              type="button"
              className="btn-green text-sm"
              onClick={() => {
                if (playing) screenRef.current?.pause();
                else screenRef.current?.play();
              }}
            >
              {playing ? "❚❚ PAUSE" : "▶ PLAY"}
            </button>
            <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => changeChannel(1)}>
              NEXT ⏭
            </button>
            <button
              type="button"
              className="btn-pink-outline px-3 py-2 text-xs"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                screenRef.current?.mute(next);
              }}
            >
              {muted ? "UNMUTE" : "MUTE"}
            </button>
          </div>
          <button
            type="button"
            className="btn-pink-outline inline-flex items-center gap-2 text-sm font-bold tracking-widest"
            onClick={() => setBrowsing((v) => !v)}
          >
            ▶ BROWSE VIDEOS
          </button>
          <AnimatePresence>
            {browsing && (
              <motion.ul
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 space-y-2"
              >
                {sorted.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => tuneTo(v)}
                      className={`w-full border-b px-1 py-3 text-left transition ${
                        active?.id === v.id
                          ? "border-neon-pink text-neon-pink"
                          : "border-white/15 text-white hover:border-neon-teal/50"
                      }`}
                    >
                      <span className="font-semibold">{v.title}</span>
                      <span className="block text-xs text-violet-300">{v.artist}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
