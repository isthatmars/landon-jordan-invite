"use client";

import type { SiteContent } from "@/lib/types";
import { Reveal } from "./Reveal";

const icons = {
  skate: "🛼",
  dinner: "🍽️",
  dj: "🎧",
} as const;

export function Lineup({ content }: { content: SiteContent }) {
  return (
    <section id="lineup" className="section-pad">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex items-center justify-center gap-4 mb-3">
            <span className="h-px w-12 bg-white/40" />
            <h2 className="text-center text-xl sm:text-2xl tracking-[0.25em] font-bold">
              {content.lineupTitle}
            </h2>
            <span className="h-px w-12 bg-white/40" />
          </div>
          <p className="text-center text-xs sm:text-sm tracking-[0.2em] text-violet-200 mb-14">
            {content.lineupTagline}
          </p>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {content.lineup.map((block, i) => (
            <Reveal key={block.id} delay={i * 0.08}>
              <div className="text-center md:text-left">
                <div className="mx-auto md:mx-0 mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-neon-pink/70 text-2xl shadow-[0_0_18px_#ff2bd650]">
                  {icons[block.icon]}
                </div>
                <p className="text-neon-gold font-bold tracking-wide mb-1">{block.time}</p>
                <h3 className="text-lg font-extrabold tracking-wide mb-2">{block.title}</h3>
                <p className="text-sm text-violet-100/85 leading-relaxed">{block.description}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 space-y-4">
          <div className="neon-frame flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 bg-black/40">
            <span aria-hidden>👗</span>
            <p className="flex-1 font-bold tracking-wide">
              DRESS CODE: <span className="text-neon-pink">{content.dressCode}</span>
            </p>
            <p className="text-sm text-violet-100 flex items-center gap-2">
              <span aria-hidden>🏆</span> {content.dressCodePrize}
            </p>
          </div>
          <p className="text-center text-sm tracking-widest text-neon-gold">
            🔒 {content.privateNote}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
