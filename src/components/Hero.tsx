"use client";

import type { ReactNode } from "react";
import type { SiteContent } from "@/lib/types";
import { CalendarIcon, ClockIcon, Crown, GreenSwoosh, PinIcon, PinkSwoosh } from "./icons";

export function Hero({ content }: { content: SiteContent }) {
  const dateParts = content.eventDate.trim().split(/\s+/);
  const dateKicker = dateParts[0] ?? "";
  const dateRestRaw = dateParts.slice(1).join(" ");
  const dateRest = /2026/.test(dateRestRaw) ? dateRestRaw : dateRestRaw.replace(/19(?:TH|th)?/, "19, 2026");

  return (
    <section id="home" className="relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-bg-miami.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05010f]/80 via-transparent to-[#05010f]/55" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#120018]/35" />

      <div className="relative z-10 mx-auto max-w-[1100px] px-2 pb-3 pt-14 sm:px-5 sm:pb-4 sm:pt-[4.5rem]">
        <div className="grid grid-cols-[0.86fr_1.14fr] items-end gap-1 sm:grid-cols-[1.02fr_0.98fr]">
          <div className="relative flex items-end justify-start">
            <div className="floor-contact bottom-1" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-couple-cutout.png"
              alt="Landon and Jordan in 80s windbreakers"
              className="relative z-[1] h-auto w-full max-w-[560px] object-contain object-bottom sm:max-h-[520px]"
              draggable={false}
            />
          </div>

          <div className="relative z-[2] pb-1 text-center sm:pb-6">
            <Crown className="mx-auto mb-0.5 h-5 w-8 drop-shadow-[0_0_10px_#ffd45a] sm:mb-1 sm:h-10 sm:w-14" />
            <h1 className="neon-script-lg text-[1.7rem] leading-none sm:text-6xl">
              {content.heroScript}
            </h1>
            <p className="chrome-80s mx-auto mt-0.5 text-[clamp(2.7rem,13vw,9.2rem)]" aria-label="80s">
              {content.heroChrome}
            </p>
            <p className="text-[0.48rem] font-extrabold tracking-[0.28em] text-[#7CFF3A] drop-shadow-[0_0_10px_#39ff14] sm:mt-1 sm:text-sm sm:tracking-[0.42em]">
              {content.heroSubtitle}
            </p>
            <GreenSwoosh className="mx-auto h-2 w-24 sm:-mt-1 sm:h-3 sm:w-52" />
            <p className="neon-script-lg text-[1.7rem] leading-none sm:mt-2 sm:text-6xl">{content.heroInvite}</p>
            <PinkSwoosh className="mx-auto h-4 w-28 sm:-mt-1 sm:h-6 sm:w-56" />
          </div>
        </div>

        <div className="relative z-20 mt-1 flex items-center justify-between gap-1 px-0.5">
          <Fact icon={<CalendarIcon className="h-5 w-5 shrink-0 sm:h-8 sm:w-8" />}>
            <span className="block text-[7px] font-semibold tracking-[0.12em] text-white/80 sm:text-[10px]">
              {dateKicker}
            </span>
            <span className="block text-[8px] font-extrabold tracking-wide sm:text-[13px]">{dateRest}</span>
          </Fact>
          <span className="h-6 w-px shrink-0 bg-white/25" aria-hidden />
          <Fact icon={<PinIcon className="h-5 w-5 shrink-0 sm:h-8 sm:w-8" />}>
            <span className="block text-[8px] font-extrabold tracking-wide sm:text-[12px]">{content.eventVenue}</span>
            <span className="block max-w-[7.2rem] text-[7px] font-medium leading-tight tracking-wide text-white/80 sm:max-w-[15rem] sm:text-[10px]">
              {content.eventAddress}
            </span>
          </Fact>
          <span className="h-6 w-px shrink-0 bg-white/25" aria-hidden />
          <Fact icon={<ClockIcon className="h-5 w-5 shrink-0 sm:h-8 sm:w-8" />}>
            <span className="block text-[8px] font-extrabold tracking-wide sm:text-[13px]">{content.eventTime}</span>
          </Fact>
        </div>
        <a href="#rsvp" className="btn-rsvp-now mt-2 block w-full px-4 py-2 text-center text-[12px]">
          RSVP NOW <span aria-hidden>›</span>
        </a>
      </div>
    </section>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>{children}</div>
    </div>
  );
}
