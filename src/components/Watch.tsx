"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import type { VideoItem } from "@/lib/types";
import { Reveal } from "./Reveal";

export function Watch({
  headline,
  videos,
}: {
  headline: string;
  videos: VideoItem[];
}) {
  const sorted = [...videos].sort((a, b) => a.sortOrder - b.sortOrder);
  const [active, setActive] = useState(sorted[0] || null);
  const [browsing, setBrowsing] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <section id="watch" className="section-pad relative">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div className="relative mx-auto max-w-xl">
            <div className="relative overflow-hidden rounded-xl border-[10px] border-[#5c3a22] bg-[#2a1a10] shadow-[0_20px_60px_#000]">
              <div className="relative aspect-[4/3] bg-black crt-scanlines overflow-hidden">
                {active?.videoUrl && playing ? (
                  <video
                    key={active.id}
                    src={active.videoUrl}
                    className="h-full w-full object-cover"
                    controls
                    autoPlay
                    onEnded={() => setPlaying(false)}
                  />
                ) : (
                  <>
                    <Image
                      src={active?.posterUrl || "/images/crt-tv.jpg"}
                      alt={active ? `${active.title} placeholder` : "CRT TV"}
                      fill
                      className="object-cover opacity-90"
                      sizes="(max-width:768px) 100vw, 50vw"
                    />
                    <button
                      type="button"
                      onClick={() => setPlaying(true)}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label="Play video"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/85 text-2xl text-black shadow-[0_0_30px_#fff8]">
                        ▶
                      </span>
                    </button>
                  </>
                )}
                {!active?.videoUrl && playing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
                    <p className="text-sm text-violet-200">
                      Placeholder — add a real <code className="text-neon-teal">videoUrl</code> in
                      Admin → Videos. Showing channel static vibes for now.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Image
                src="/images/remote.jpg"
                alt="80s TV remote"
                width={120}
                height={120}
                className="rounded-lg border border-white/10 shadow-lg opacity-90"
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <h2 className="neon-script-lg text-4xl sm:text-5xl mb-6">{headline}</h2>
          <button
            type="button"
            className="btn-pink-outline inline-flex items-center gap-2 text-sm tracking-widest font-bold"
            onClick={() => setBrowsing((v) => !v)}
          >
            ▶ BROWSE VIDEOS
          </button>

          {browsing && (
            <motion.ul
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-2"
            >
              {sorted.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(v);
                      setPlaying(false);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      active?.id === v.id
                        ? "border-neon-pink bg-pink-500/10"
                        : "border-white/10 bg-black/30 hover:border-neon-teal/40"
                    }`}
                  >
                    <span className="font-semibold">{v.title}</span>
                    <span className="block text-xs text-violet-300">{v.artist}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
          <p className="mt-6 text-sm text-violet-300/80 max-w-md">
            Classic music-video browser on a wood CRT. Swap placeholders anytime from the neon
            admin.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
