"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { arcadeScreen } from "@/lib/cutouts";
import { ArcadeBackdrop } from "./ArcadeBackdrop";
import { GamepadIcon, GreenSwoosh, NeonArrow } from "./icons";
import { PacManGame } from "./PacManGame";

export function Arcade({ headline }: { headline: string }) {
  const [running, setRunning] = useState(false);
  const [narrow, setNarrow] = useState(false);

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
    <section id="arcade" className="scene-section relative overflow-hidden">
      <ArcadeBackdrop />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#05010f] to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] items-end px-4 py-6 md:px-4 md:py-6">
        <div className="flex w-full flex-col items-center justify-center gap-3 md:flex-row md:items-end md:gap-4">
          <div className="relative z-20 order-1 w-full pb-1 text-center md:order-1 md:w-[28%] md:pb-6 md:text-left">
            <h2 className="neon-script-lg text-[34px] leading-[0.92] sm:text-[3.1rem]">{script}</h2>
            <GreenSwoosh className="mx-auto mt-1 h-3 w-24 md:mx-0 min-[640px]:w-36" />
            <NeonArrow className="mx-auto mt-1 h-8 w-16 md:mx-0 min-[640px]:ml-6 min-[640px]:h-10 min-[640px]:w-16" />
            {!running && (
              <button
                type="button"
                className="btn-pink-outline mt-3 inline-flex min-h-12 items-center gap-2 px-5 py-3 text-base font-bold tracking-[0.14em] md:min-h-0 md:px-4 md:py-1.5 md:text-xs"
                onClick={() => setRunning(true)}
              >
                <GamepadIcon className="h-4 w-5" />
                START GAME
              </button>
            )}
            {!overlay && running && (
              <button
                type="button"
                className="btn-pink-outline mt-3 inline-flex min-h-12 items-center px-5 py-3 text-base font-bold tracking-[0.14em] md:min-h-0 md:px-4 md:py-1.5 md:text-xs"
                onClick={() => setRunning(false)}
              >
                CLOSE GAME
              </button>
            )}
          </div>

          <div className="relative order-2 w-[78%] max-w-[520px] md:order-2 md:w-[48%]">
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
              className="absolute z-20 overflow-hidden bg-black"
              style={arcadeScreen}
            >
              {!overlay && <PacManGame running={running} embed />}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-arcade-bartop.png"
              alt="Front-facing Pac-Man arcade cabinet"
              className="pointer-events-none relative z-10 block h-auto w-full"
              draggable={false}
            />
          </div>

          <div className="relative order-3 w-[34%] max-w-[140px] shrink-0 md:w-[22%] md:max-w-[210px]">
            <div className="floor-contact" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-skate-pair.png"
              alt=""
              className="relative block h-auto w-full"
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
            <PacManGame running showPad />
          </div>,
          document.body,
        )}
    </section>
  );
}
