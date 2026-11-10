"use client";

import { useState } from "react";
import { arcadeScreen } from "@/lib/cutouts";
import { GamepadIcon, GreenSwoosh, NeonArrow } from "./icons";
import { PacManGame } from "./PacManGame";

export function Arcade({ headline }: { headline: string }) {
  const [running, setRunning] = useState(false);
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/scene-arcade-room.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_72%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#05010f] to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1000px] items-end px-2 py-3 sm:px-6 sm:py-12">
        <div className="flex w-full items-end justify-center gap-2 sm:gap-4">
          <div className="relative z-20 w-[30%] pb-3 text-left sm:pb-8">
            <h2 className="neon-script-lg text-[1.45rem] leading-[0.9] min-[640px]:text-[2.6rem]">{script}</h2>
            <GreenSwoosh className="mt-1 h-3 w-24 min-[640px]:w-36" />
            <NeonArrow className="mt-1 h-8 w-12 min-[640px]:ml-6 min-[640px]:h-10 min-[640px]:w-16" />
            <button
              type="button"
              className="btn-pink-outline mt-3 inline-flex items-center gap-2 px-2 py-1.5 text-[9px] font-bold tracking-[0.14em] min-[640px]:px-4 min-[640px]:text-xs"
              onClick={() => setRunning(true)}
            >
              <GamepadIcon className="h-4 w-5" />
              START GAME
            </button>
          </div>

          <div className="relative w-[42%] max-w-[360px]">
            <div className="floor-contact" />
            <div
              data-testid="arcade-screen"
              data-screen="arcade"
              className="absolute z-20 overflow-hidden bg-black"
              style={arcadeScreen}
            >
              <PacManGame running={running} embed />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-arcade-bartop.png"
              alt="Front-facing Pac-Man arcade cabinet"
              className="relative z-10 block h-auto w-full pointer-events-none"
              draggable={false}
            />
          </div>

          <div className="relative w-[22%] max-w-[210px] shrink-0">
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
