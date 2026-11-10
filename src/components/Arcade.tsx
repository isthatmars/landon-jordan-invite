"use client";

import Image from "next/image";
import { useState } from "react";
import { PacManGame } from "./PacManGame";
import { PinballLite } from "./PinballLite";
import { Reveal } from "./Reveal";

export function Arcade({ headline }: { headline: string }) {
  const [game, setGame] = useState<"pacman" | "pinball">("pacman");
  const [running, setRunning] = useState(false);

  return (
    <section id="arcade" className="section-pad relative">
      <div className="pointer-events-none absolute inset-0 opacity-30 grid-glow" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 className="neon-script-lg text-4xl sm:text-5xl mb-2">{headline}</h2>
          <p className="text-violet-200 mb-6 text-sm">
            Keyboard + touch. Switch cabinets anytime.
          </p>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              className="btn-pink-outline text-sm tracking-widest font-bold"
              onClick={() => {
                setGame("pacman");
                setRunning(true);
              }}
            >
              🎮 START GAME
            </button>
            <button
              type="button"
              className={`text-xs tracking-widest px-4 py-2 rounded-full border ${
                game === "pacman" ? "border-neon-teal text-neon-teal" : "border-white/20"
              }`}
              onClick={() => setGame("pacman")}
            >
              PAC-MAN
            </button>
            <button
              type="button"
              className={`text-xs tracking-widest px-4 py-2 rounded-full border ${
                game === "pinball" ? "border-neon-teal text-neon-teal" : "border-white/20"
              }`}
              onClick={() => {
                setGame("pinball");
                setRunning(true);
              }}
            >
              PINBALL
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-[0_0_30px_#3b82f640]">
            {!running ? (
              <p className="text-center text-sm text-violet-300 py-16">
                Press START GAME to boot the cabinet.
              </p>
            ) : game === "pacman" ? (
              <PacManGame running={running} />
            ) : (
              <PinballLite running={running} />
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_40px_#ff2bd630]">
            <Image
              src="/images/arcade-cabinet.jpg"
              alt="Pac-Man arcade cabinet"
              width={900}
              height={675}
              className="h-auto w-full object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
