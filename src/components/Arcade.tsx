"use client";

import { useEffect, useState } from "react";
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

  const expanded = narrow && running;
  const parts = headline.replace("!", "").trim().split(/\s+/);
  const script = (
    <>
      {parts[0] || "Play"}
      <br />
      {parts.slice(1).join(" ") || "Pac-Man"}!
    </>
  );

  return (
    <section id="arcade" className={`scene-section relative overflow-hidden${expanded ? " is-playing" : ""}`}>
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
          </div>

          <div className={`relative order-2 w-[78%] max-w-[520px] md:order-2 md:w-[48%]${expanded ? " w-full max-w-none" : ""}`}>
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
              className={
                expanded
                  ? "relative z-20 mx-auto w-full max-w-[430px] bg-black"
                  : "absolute z-20 overflow-hidden bg-black"
              }
              style={expanded ? undefined : arcadeScreen}
            >
              <PacManGame running={running} embed={!expanded} showPad={expanded} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-arcade-bartop.png"
              alt="Front-facing Pac-Man arcade cabinet"
              className={`pointer-events-none relative z-10 block h-auto w-full${expanded ? " hidden" : ""}`}
              draggable={false}
            />
          </div>

          <div className={`relative order-3 w-[34%] max-w-[140px] shrink-0 md:w-[22%] md:max-w-[210px]${expanded ? " hidden" : ""}`}>
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
    </section>
  );
}
