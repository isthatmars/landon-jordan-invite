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
        className="absolute inset-0 h-full w-full object-cover object-[center_60%]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05010f] via-[#05010f22] to-[#07010f]" />

      <div className="relative z-10 mx-auto grid max-w-[1100px] items-end gap-4 px-3 py-8 sm:px-5 min-[640px]:grid-cols-[0.7fr_1.05fr_0.62fr] min-[640px]:items-center min-[640px]:py-12">
        <div className="relative z-20 pb-2 text-center min-[640px]:pb-10 min-[640px]:text-left">
          <h2 className="neon-script-lg text-[2.5rem] leading-[0.9] sm:text-5xl">{script}</h2>
          <GreenSwoosh className="mx-auto mt-1 h-3 w-36 min-[640px]:mx-0" />
          <NeonArrow className="mx-auto mt-1 h-10 w-16 min-[640px]:ml-10" />
          <button
            type="button"
            className="btn-pink-outline mt-3 inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em]"
            onClick={() => setRunning(true)}
          >
            <GamepadIcon className="h-4 w-5" />
            START GAME
          </button>
        </div>

        <div className="relative mx-auto w-full max-w-[340px] min-[640px]:max-w-[380px]">
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
            className="relative z-10 block h-auto w-full pointer-events-none drop-shadow-[0_30px_36px_rgba(0,0,0,0.7)]"
            draggable={false}
          />
        </div>

        <div className="relative hidden min-h-[180px] min-[640px]:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-skate-pair.png"
            alt=""
            className="ml-auto w-[92%] max-w-[230px] drop-shadow-2xl"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
