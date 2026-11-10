"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";
import { Cassette, CassetteStackHeight } from "./Cassette";
import { useLightParallax } from "./Parallax";
import { YoutubeScreen, type YoutubeHandle } from "./YoutubeScreen";

export function Mixtape({
  headline,
  tracks,
}: {
  headline: string;
  tracks: Track[];
}) {
  const sorted = [...tracks].sort((a, b) => a.sortOrder - b.sortOrder);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const screenRef = useRef<YoutubeHandle>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const light = useLightParallax();
  const active = sorted.find((t) => t.id === activeId) ?? null;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["-8%", "8%"]);
  const propY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["6%", "-6%"]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const time = screenRef.current?.readTime();
      if (!time) return;
      setProgress(time.current);
      setDuration(time.duration);
    }, 400);
    return () => window.clearInterval(timer);
  }, [playing, activeId]);

  const selectTape = (id: string) => {
    setInsertingId(id);
    setActiveId(id);
    setPlaying(true);
    setProgress(0);
    window.setTimeout(() => setInsertingId(null), 700);
  };

  const step = (dir: -1 | 1) => {
    if (!sorted.length) return;
    const index = Math.max(0, sorted.findIndex((t) => t.id === activeId));
    const next = sorted[(index + dir + sorted.length) % sorted.length];
    selectTape(next.id);
  };

  const togglePlay = () => {
    if (!active) {
      if (sorted[0]) selectTape(sorted[0].id);
      return;
    }
    if (playing) {
      screenRef.current?.pause();
      setPlaying(false);
    } else {
      screenRef.current?.play();
      setPlaying(true);
    }
  };

  const stackH = CassetteStackHeight(sorted.length);

  return (
    <section
      ref={sectionRef}
      id="mixtape"
      className="scene-section relative min-h-[100svh] w-full overflow-hidden"
    >
      <motion.div className="absolute inset-[-10%] z-0" style={{ y: bgY }}>
        <Image
          src="/images/scene-mixtape-table.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05010f] via-transparent to-[#05010f]" />
      </motion.div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-end gap-8 px-4 pb-16 pt-28 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-4 md:px-6 md:pb-24">
        <motion.div className="relative" style={{ y: propY }}>
          <div className="relative mx-auto w-full max-w-xl">
            <Image
              src="/images/prop-boombox.png"
              alt="Chrome 80s boombox"
              width={900}
              height={560}
              className="h-auto w-full drop-shadow-[0_30px_50px_#000c]"
            />
            <div className="absolute left-[31%] top-[40%] z-20 h-[18%] w-[30%] overflow-hidden rounded-sm bg-black shadow-[inset_0_0_12px_#000]">
              {active?.youtubeId ? (
                <YoutubeScreen
                  ref={screenRef}
                  videoId={active.youtubeId}
                  title={`${active.artist} — ${active.title}`}
                  onEnded={() => step(1)}
                  onPlayingChange={setPlaying}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-[10px] uppercase tracking-widest text-zinc-400">
                  Deck empty
                </div>
              )}
            </div>
            <AnimatePresence>
              {insertingId && active && (
                <motion.div
                  key={insertingId}
                  initial={{ opacity: 0, x: 100, y: 50, rotate: 12, scale: 0.7 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.9 }}
                  exit={{ opacity: 0, scale: 0.3, y: -8 }}
                  transition={{ duration: 0.45 }}
                  className="absolute left-[30%] top-[36%] z-10 w-[34%]"
                >
                  <Image
                    src="/images/cassette-case-blank.png"
                    alt=""
                    width={280}
                    height={160}
                    className="h-auto w-full"
                  />
                  <div
                    className="absolute left-[14%] right-[14%] top-[38%] h-[22%] rounded-[2px]"
                    style={{ background: active.color }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <Image
              src="/images/prop-headphones.png"
              alt=""
              width={220}
              height={220}
              className="absolute -bottom-6 -left-2 w-[28%] drop-shadow-2xl md:-left-6"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-neon-teal">Now playing</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={active?.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-lg font-semibold"
                >
                  {active ? `${active.artist} — ${active.title}` : "Pick a tape"}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => step(-1)}>
                ⏮ PREV
              </button>
              <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => screenRef.current?.replay()}>
                ↺ REPLAY
              </button>
              <button type="button" onClick={togglePlay} className="btn-green text-sm">
                {playing ? "❚❚ PAUSE" : "▶ PLAY"}
              </button>
              <button
                type="button"
                className="btn-pink-outline px-3 py-2 text-xs"
                onClick={() => {
                  screenRef.current?.stop();
                  setPlaying(false);
                  setProgress(0);
                }}
              >
                ■ STOP
              </button>
              <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => step(1)}>
                NEXT ⏭
              </button>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Playback position</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(progress, duration || 0)}
              onChange={(e) => {
                const next = Number(e.target.value);
                setProgress(next);
                screenRef.current?.seek(next);
              }}
              className="w-full accent-pink-500"
            />
          </label>
          <p className="mt-1 text-[11px] text-violet-300">
            Official video plays in the deck. {formatTime(progress)} / {formatTime(duration)}
          </p>
        </motion.div>

        {/* Physical cassette pile on the table */}
        <div className="relative pb-4 md:pb-0">
          <div className="mb-5 flex items-end gap-3">
            <h2 className="neon-script-lg text-3xl leading-tight sm:text-4xl md:text-5xl">
              {headline}
            </h2>
            <svg
              className="mb-2 hidden shrink-0 text-neon-pink sm:block"
              width="56"
              height="36"
              viewBox="0 0 56 36"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 18c12-10 28-12 40-6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path d="M38 8l10 6-8 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <div className="relative mx-auto w-full max-w-[320px]" style={{ height: stackH }}>
            {sorted.map((t, idx) => (
              <Cassette
                key={t.id}
                track={t}
                index={idx}
                total={sorted.length}
                selected={t.id === active?.id}
                inserting={insertingId === t.id}
                onSelect={() => selectTape(t.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.floor(seconds);
  const min = Math.floor(whole / 60);
  const sec = String(whole % 60).padStart(2, "0");
  return `${min}:${sec}`;
}
