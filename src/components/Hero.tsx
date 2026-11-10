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

      <div className="relative z-10 mx-auto max-w-[1100px] px-3 pb-4 pt-16 sm:px-5 sm:pt-[4.5rem]">
        <div className="grid items-center gap-2 min-[640px]:grid-cols-[1.02fr_0.98fr]">
          <div className="relative flex items-end justify-center min-[640px]:justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="floor-contact bottom-1" />
            <img
              src="/images/hero-couple-cutout.png"
              alt="Landon and Jordan in 80s windbreakers"
              className="relative z-[1] h-auto w-full max-w-[560px] object-contain object-bottom max-[639px]:max-h-[46vh] min-[640px]:max-h-[520px]"
              draggable={false}
            />
          </div>

          <div className="relative z-[2] px-1 pb-2 text-center min-[640px]:pb-8">
            <Crown className="mx-auto mb-1 h-8 w-12 drop-shadow-[0_0_10px_#ffd45a] sm:h-10 sm:w-14" />
            <h1 className="neon-script-lg text-[2.35rem] leading-none sm:text-5xl">
              {content.heroScript}
            </h1>
            <p className="chrome-80s mx-auto mt-1 text-[clamp(5.4rem,18vw,9.2rem)]" aria-label="80s">
              {content.heroChrome}
            </p>
            <p className="mt-1 text-[0.78rem] font-extrabold tracking-[0.42em] text-[#7CFF3A] drop-shadow-[0_0_10px_#39ff14] sm:text-sm">
              {content.heroSubtitle}
            </p>
            <GreenSwoosh className="mx-auto -mt-1 h-3 w-40 sm:w-52" />
            <p className="neon-script-lg mt-2 text-[2.15rem] leading-none sm:text-5xl">{content.heroInvite}</p>
            <PinkSwoosh className="mx-auto -mt-1 h-6 w-44 sm:w-56" />
          </div>
        </div>

        <div className="relative z-20 -mt-2 flex flex-col gap-3 rounded-full bg-[#0a0614]/72 px-4 py-3 shadow-[0_10px_30px_#0008] backdrop-blur-md min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between min-[640px]:rounded-full min-[640px]:py-2.5">
          <div className="flex flex-1 flex-col gap-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between min-[640px]:gap-2">
            <Fact icon={<CalendarIcon className="h-8 w-8 shrink-0" />}>
              <span className="block text-[10px] font-semibold tracking-[0.16em] text-white/80">
                {dateKicker}
              </span>
              <span className="block text-[13px] font-extrabold tracking-wide">{dateRest}</span>
            </Fact>
            <span className="hidden h-8 w-px bg-white/25 min-[640px]:block" aria-hidden />
            <Fact icon={<PinIcon className="h-8 w-8 shrink-0" />}>
              <span className="block text-[12px] font-extrabold tracking-wide">{content.eventVenue}</span>
              <span className="block max-w-[15rem] text-[10px] font-medium leading-tight tracking-wide text-white/80">
                {content.eventAddress}
              </span>
            </Fact>
            <span className="hidden h-8 w-px bg-white/25 min-[640px]:block" aria-hidden />
            <Fact icon={<ClockIcon className="h-8 w-8 shrink-0" />}>
              <span className="block text-[13px] font-extrabold tracking-wide">{content.eventTime}</span>
            </Fact>
          </div>
          <a href="#rsvp" className="btn-rsvp-now shrink-0 whitespace-nowrap px-4 py-2 text-[12px]">
            RSVP NOW <span aria-hidden>›</span>
          </a>
        </div>
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
