"use client";

import type { SiteContent } from "@/lib/types";
import { LineIcon } from "./icons";

export function Lineup({ content }: { content: SiteContent }) {
  return (
    <section id="lineup" className="bg-[#07010f] px-2 py-6 sm:px-5 sm:py-16">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-2 flex items-center justify-center gap-4">
          <span className="h-px w-10 bg-white/50 sm:w-16" />
          <h2 className="text-center text-[13px] font-semibold tracking-[0.28em] sm:text-base">
            {content.lineupTitle}
          </h2>
          <span className="h-px w-10 bg-white/50 sm:w-16" />
        </div>
        <p className="mb-10 text-center text-[10px] tracking-[0.22em] text-white/75 sm:text-xs">
          {content.lineupTagline}
        </p>

        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          {content.lineup.map((block) => (
            <div key={block.id} className="flex items-start gap-1.5 sm:gap-3">
              <LineIcon
                name={block.icon}
                className="mt-0.5 h-7 w-7 shrink-0 text-[#ff4fd8] drop-shadow-[0_0_8px_#ff4fd8] sm:h-12 sm:w-12"
              />
              <div>
                <p className="text-[8px] font-bold tracking-wide text-[#ff4fd8] sm:text-[12px]">{block.time}</p>
                <h3 className="mt-0.5 text-[9px] font-extrabold leading-tight tracking-wide text-[#f6c945] sm:text-[15px]">
                  {block.title}
                </h3>
                <p className="mt-1 text-[8px] leading-snug text-white/80 sm:text-[12.5px] sm:leading-relaxed">{block.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-row items-center gap-2 rounded-full border-2 border-[#ff4fd8] bg-black/40 px-2 py-2 shadow-[0_0_18px_#ff4fd855] sm:mt-10 sm:gap-4 sm:px-5 sm:py-3">
          <div className="flex flex-1 items-center justify-start gap-1.5 sm:gap-2">
            <LineIcon name="hanger" className="h-7 w-7 shrink-0 text-[#ff4fd8]" />
            <p className="text-sm font-bold tracking-wide">
              DRESS CODE:{" "}
              <span className="font-[family-name:var(--font-script)] text-lg font-normal text-[#ff4fd8] sm:text-2xl">
                {content.dressCode}
              </span>
            </p>
          </div>
          <span className="hidden h-8 w-px bg-white/25 min-[640px]:block" aria-hidden />
          <p className="flex flex-1 items-center justify-center gap-2 text-left text-[13px] text-white/90 min-[640px]:justify-start">
            <LineIcon name="trophy" className="h-7 w-7 shrink-0 text-[#f6c945]" />
            {content.dressCodePrize}
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="flex items-center justify-center gap-2 text-[12px] font-bold tracking-[0.18em] text-[#f6c945] sm:text-sm">
            <LineIcon name="lock" className="h-5 w-5" />
            {content.privateNote}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-relaxed text-white/80">
            We&apos;re keeping this celebration exclusive. This event is strictly for invited
            guests. Please register every adult and child by name, and do not bring anyone who
            isn&apos;t on the list.
          </p>
        </div>
      </div>
    </section>
  );
}
