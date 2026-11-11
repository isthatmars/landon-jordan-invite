"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { arcadeScreen } from "@/lib/cutouts";
import { useLiveFlag } from "@/lib/useLiveFlag";
import { ArcadeBackdrop } from "./ArcadeBackdrop";
import { GreenSwoosh, NeonArrow, PacManIcon } from "./icons";
import { PacManGame } from "./PacManGame";

export function Arcade({ headline }: { headline: string }) {
  const [running, setRunning] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const arcadeLive = useLiveFlag("liveArcade");

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const overlay = narrow && running;

  useEffect(() => {
    if (!overlay) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const blockScroll = (event: TouchEvent) => event.preventDefault();
    document.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("touchmove", blockScroll);
    };
  }, [overlay]);
  const parts = headline.replace("!", "").trim().split(/\s+/);
  const script = (
    <>
      {parts[0] || "Play"}
      <br />
      {parts.slice(1).join(" ") || "Pac-Man"}!
    </>
  );

  return (
    <section id="arcade" className="scene-section relative overflow-x-clip overflow-y-visible">
      <ArcadeBackdrop />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#05010f] to-transparent" />

      {/* Stage fills the plate and centers the composition so sticky overlap
          cannot clip cabinet controls / sneakers / START GAME. */}
      <div className="arcade-stage">
        <div className="arcade-row">
          <div className="arcade-copy relative z-20 order-1 w-full overflow-visible text-center md:order-1 md:w-[30%] md:text-left">
            <h2 className="neon-script-lg arcade-title">{script}</h2>
            <GreenSwoosh className="mx-auto mt-0.5 h-3 w-24 md:mx-0 md:mt-0.5 min-[640px]:w-36" />
            <NeonArrow className="arcade-arrow mx-auto mt-1 h-8 w-16 md:mx-0 md:mt-0.5 min-[640px]:ml-6 min-[640px]:h-10 min-[640px]:w-16" />
            {!running && (
              <button
                type="button"
                className="btn-pink-outline arcade-start"
                onClick={() => setRunning(true)}
              >
                <span className="arcade-start-pellets" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <PacManIcon className="arcade-start-icon h-5 w-5" />
                START GAME
                <span className="arcade-start-pellets arcade-start-pellets-end" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            )}
            {!overlay && running && (
              <div className="arcade-play-controls">
                <p className="arcade-keys-cue" role="status">
                  Use <span className="arcade-keys-cue-keys">← ↑ → ↓</span> arrow keys to move
                </p>
                <button type="button" className="btn-pink-outline arcade-start" onClick={() => setRunning(false)}>
                  <span className="arcade-start-pellets" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  CLOSE GAME
                  <span className="arcade-start-pellets arcade-start-pellets-end" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="arcade-cab relative order-2 w-[88%] max-w-[480px] md:order-2 md:w-[46%]">
            <div className="arcade-machine">
              <div className="floor-contact" />
              <div className="cab-lights" aria-hidden>
                <span className="cab-glint cab-glint-a" />
                <span className="cab-glint cab-glint-b" />
                <span className="cab-glint cab-glint-c" />
                <span className="cab-glint cab-glint-d" />
              </div>
              <div
                data-testid="arcade-screen"
                data-screen="arcade"
                className="absolute z-[1] overflow-hidden bg-black"
                style={arcadeScreen}
              >
                {!overlay && (
                  <PacManGame key={running ? "play" : "idle"} running={running && arcadeLive} embed />
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/prop-arcade-bartop.png"
                alt="Front-facing Pac-Man arcade cabinet"
                className="pointer-events-none relative z-10 block h-auto w-full"
                draggable={false}
              />
            </div>
          </div>

          <div className="arcade-skates relative order-3 w-[34%] max-w-[140px] shrink-0 md:w-[20%] md:max-w-[190px]">
            <div className="floor-contact" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-skate-pair.png"
              alt=""
              className="relative z-[1] block h-auto w-full"
              draggable={false}
            />
          </div>
        </div>
      </div>
      {overlay &&
        createPortal(
          <div className="game-overlay" role="dialog" aria-modal="true" aria-label="Pac-Man">
            <button type="button" className="game-close" aria-label="Close game" onClick={() => setRunning(false)}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
            <PacManGame running={running && arcadeLive} showPad />
          </div>,
          document.body,
        )}
    </section>
  );
}
