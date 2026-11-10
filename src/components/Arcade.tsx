"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef, useState } from "react";
import { PacManGame } from "./PacManGame";
import { PinballLite } from "./PinballLite";
import { useLightParallax } from "./Parallax";

export function Arcade({ headline }: { headline: string }) {
  const [game, setGame] = useState<"pacman" | "pinball">("pacman");
  const [running, setRunning] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const light = useLightParallax();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["-8%", "8%"]);
  const cabY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["10%", "-6%"]);

  return (
    <section
      ref={sectionRef}
      id="arcade"
      className="scene-section relative min-h-[100svh] w-full overflow-hidden"
    >
      <motion.div className="absolute inset-[-10%] z-0" style={{ y: bgY }}>
        <Image
          src="/images/scene-arcade-room.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05010f] via-transparent to-[#05010f]" />
      </motion.div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-center gap-8 px-4 py-24 md:grid-cols-[0.85fr_1.15fr] md:px-6">
        <div>
          <h2 className="neon-script-lg mb-2 text-4xl sm:text-5xl">{headline}</h2>
          <svg
            className="mb-6 text-neon-pink"
            width="72"
            height="28"
            viewBox="0 0 72 28"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 14c18-10 40-12 58-4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path d="M52 6l14 6-10 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-pink-outline text-sm font-bold tracking-widest"
              onClick={() => {
                setGame("pacman");
                setRunning(true);
              }}
            >
              START GAME
            </button>
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-xs tracking-widest ${
                game === "pacman" ? "border-neon-teal text-neon-teal" : "border-white/25"
              }`}
              onClick={() => setGame("pacman")}
            >
              PAC-MAN
            </button>
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-xs tracking-widest ${
                game === "pinball" ? "border-neon-teal text-neon-teal" : "border-white/25"
              }`}
              onClick={() => {
                setGame("pinball");
                setRunning(true);
              }}
            >
              PINBALL
            </button>
          </div>
          <p className="text-sm text-violet-200/90">Keyboard + touch · game lives in the cabinet</p>
        </div>

        <motion.div className="relative mx-auto w-full max-w-md" style={{ y: cabY }}>
          <Image
            src="/images/prop-arcade-cabinet.png"
            alt="Pac-Man arcade cabinet"
            width={640}
            height={800}
            className="relative z-[1] h-auto w-full drop-shadow-[0_40px_70px_#000c]"
          />
          {/* Game screen inset — sits on the cabinet glass */}
          <div className="absolute left-[30%] right-[24%] top-[20%] bottom-[55%] z-[2] overflow-hidden rounded-sm bg-black/90 shadow-[inset_0_0_20px_#000]">
            {!running ? (
              <button
                type="button"
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-neon-green"
                onClick={() => setRunning(true)}
              >
                <span className="text-[10px] tracking-[0.3em]">INSERT COIN</span>
                <span className="text-xs tracking-widest text-white/80">TAP TO START</span>
              </button>
            ) : (
              <div className="flex h-full items-center justify-center overflow-auto p-1 scale-[0.92] origin-center">
                {game === "pacman" ? (
                  <PacManGame running={running} />
                ) : (
                  <PinballLite running={running} />
                )}
              </div>
            )}
          </div>
          <Image
            src="/images/prop-roller-skate.png"
            alt=""
            width={200}
            height={200}
            className="absolute -right-6 bottom-[6%] z-[3] w-[34%] drop-shadow-2xl md:-right-10"
          />
        </motion.div>
      </div>
    </section>
  );
}
