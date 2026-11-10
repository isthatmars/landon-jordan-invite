"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";
import { Reveal } from "./Reveal";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const active = sorted.find((t) => t.id === activeId) || sorted[0];

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !active) return;
    el.src = active.audioUrl;
    el.load();
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    }
  }, [active?.id, active?.audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const selectTape = (id: string) => {
    setActiveId(id);
    setPlaying(true);
  };

  return (
    <section id="mixtape" className="section-pad relative">
      <div className="pointer-events-none absolute inset-0 grid-glow opacity-40" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <h2 className="neon-script-lg text-center text-3xl sm:text-5xl mb-12">{headline}</h2>
        </Reveal>

        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_40px_#ff2bd630]">
              <Image
                src="/images/boombox.jpg"
                alt="Chrome 80s boombox"
                width={1200}
                height={675}
                className="h-auto w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-neon-teal">Now playing</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={active?.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="font-semibold text-lg"
                      >
                        {active ? `${active.artist} — ${active.title}` : "Pick a tape"}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <button type="button" onClick={togglePlay} className="btn-green text-sm">
                    {playing ? "❚❚ PAUSE" : "▶ PLAY"}
                  </button>
                </div>
                {/* EQ bars */}
                <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 rounded-sm bg-neon-green/80"
                      animate={
                        playing
                          ? { height: [6, 12 + (i % 5) * 4, 8, 20, 6] }
                          : { height: 4 }
                      }
                      transition={{
                        duration: 0.6 + (i % 4) * 0.1,
                        repeat: playing ? Infinity : 0,
                        repeatType: "mirror",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <audio
              ref={audioRef}
              preload="none"
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
            <p className="mt-3 text-center text-xs text-violet-300/70">
              Placeholder tones — swap real tracks in Admin → Mixtape (or edit{" "}
              <code className="text-neon-teal">public/audio</code>).
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-col gap-3">
              {sorted.map((t, idx) => {
                const selected = t.id === active?.id;
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileHover={{ x: 6 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectTape(t.id)}
                    className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-neon-pink bg-pink-500/15 shadow-[0_0_18px_#ff2bd650]"
                        : "border-white/10 bg-black/40 hover:border-neon-teal/50"
                    }`}
                  >
                    <span
                      className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm border border-black/40 shadow-lg"
                      style={{ background: t.color }}
                    >
                      <span className="absolute inset-x-1 top-2 bottom-2 rounded-[2px] bg-black/25 border border-white/20" />
                      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-200 border border-zinc-500" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="tape-label block truncate text-white group-hover:text-neon-pink">
                        {t.artist} – {t.title}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-violet-300">
                        Tape {idx + 1}
                        {selected && playing ? " · playing" : ""}
                      </span>
                    </span>
                    <span className="text-neon-pink opacity-70">➜</span>
                  </motion.button>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
