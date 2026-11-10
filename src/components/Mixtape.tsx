"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";
import { Cassette } from "./Cassette";
import { useLightParallax } from "./Parallax";

export function Mixtape({
  headline,
  tracks,
}: {
  headline: string;
  tracks: Track[];
}) {
  const sorted = [...tracks].sort((a, b) => a.sortOrder - b.sortOrder);
  const [activeId, setActiveId] = useState<string | null>(sorted[0]?.id ?? null);
  const [playing, setPlaying] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const light = useLightParallax();
  const active = sorted.find((t) => t.id === activeId) || sorted[0];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["-8%", "8%"]);
  const propY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["6%", "-6%"]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !active) return;
    el.src = active.audioUrl;
    el.load();
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    }
  }, [active?.id, active?.audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTape = (id: string) => {
    setInsertingId(id);
    setActiveId(id);
    setPlaying(true);
    window.setTimeout(() => setInsertingId(null), 650);
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

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

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-end gap-6 px-4 pb-16 pt-28 md:grid-cols-[1.15fr_0.85fr] md:items-center md:px-6 md:pb-24">
        {/* Boombox + headphones on the table */}
        <motion.div className="relative" style={{ y: propY }}>
          <div className="relative mx-auto w-full max-w-xl">
            <Image
              src="/images/prop-boombox.png"
              alt="Chrome 80s boombox"
              width={900}
              height={560}
              className="h-auto w-full drop-shadow-[0_30px_50px_#000c]"
              priority={false}
            />
            {/* Spinning reels overlay on deck area */}
            <div className="pointer-events-none absolute left-[28%] top-[42%] flex gap-8 sm:left-[30%] sm:top-[44%] sm:gap-12">
              <DeckReel spinning={playing} />
              <DeckReel spinning={playing} />
            </div>
            {/* Inserting tape ghost */}
            <AnimatePresence>
              {insertingId && active && (
                <motion.div
                  key={insertingId}
                  initial={{ opacity: 0, x: 80, y: 40, scale: 0.6 }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 0.85 }}
                  exit={{ opacity: 0, scale: 0.4, y: -10 }}
                  className="absolute left-[32%] top-[38%] h-10 w-28 rounded-sm border border-white/40"
                  style={{ background: active.color }}
                />
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
            <button type="button" onClick={togglePlay} className="btn-green text-sm">
              {playing ? "❚❚ PAUSE" : "▶ PLAY"}
            </button>
          </div>
          <audio ref={audioRef} preload="none" onEnded={() => setPlaying(false)} className="hidden" />
        </motion.div>

        {/* Cassette stack */}
        <div className="relative pb-6 md:pb-0">
          <div className="mb-6 flex items-start gap-3">
            <h2 className="neon-script-lg text-3xl leading-tight sm:text-4xl md:text-5xl">
              {headline}
            </h2>
            <svg
              className="mt-3 hidden shrink-0 text-neon-pink sm:block"
              width="56"
              height="40"
              viewBox="0 0 56 40"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 20c12-12 28-14 40-8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#g)"
              />
              <path d="M38 8l10 6-8 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-3">
            {sorted.map((t, idx) => (
              <Cassette
                key={t.id}
                track={t}
                index={idx}
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

function DeckReel({ spinning }: { spinning: boolean }) {
  return (
    <motion.span
      className="block h-5 w-5 rounded-full border border-zinc-400/80 bg-zinc-300/40 sm:h-7 sm:w-7"
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { duration: 0.9, repeat: Infinity, ease: "linear" } : undefined}
      style={{ boxShadow: spinning ? "0 0 12px #39ff14" : undefined }}
    />
  );
}
