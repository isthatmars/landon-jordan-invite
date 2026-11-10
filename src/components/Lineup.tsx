"use client";

import type { ReactNode } from "react";
import type { SiteContent } from "@/lib/types";
import { Reveal } from "./Reveal";

type GlyphName = "skate" | "dinner" | "dj" | "hanger" | "trophy" | "lock";

export function Lineup({ content }: { content: SiteContent }) {
  return (
    <section id="lineup" className="section-pad">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-3 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-white/40" />
            <h2 className="text-center text-xl font-bold tracking-[0.25em] sm:text-2xl">
              {content.lineupTitle}
            </h2>
            <span className="h-px w-12 bg-white/40" />
          </div>
          <p className="mb-14 text-center text-xs tracking-[0.2em] text-violet-200 sm:text-sm">
            {content.lineupTagline}
          </p>
        </Reveal>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {content.lineup.map((block, i) => (
            <Reveal key={block.id} delay={i * 0.08}>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-neon-pink/80 text-neon-pink shadow-[0_0_18px_#ff2bd680]">
                  <NeonGlyph name={block.icon} />
                </div>
                <p className="mb-1 font-bold tracking-wide text-neon-pink">{block.time}</p>
                <h3 className="mb-2 text-lg font-extrabold tracking-wide">{block.title}</h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-violet-100/85">
                  {block.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 space-y-5">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-neon-pink/80 bg-black/40 px-5 py-4 text-center shadow-[0_0_18px_#ff2bd640] sm:flex-row sm:text-left">
            <span className="text-neon-pink" aria-hidden>
              <NeonGlyph name="hanger" />
            </span>
            <p className="flex-1 font-bold tracking-wide">
              DRESS CODE: <span className="text-neon-pink">{content.dressCode}</span>
            </p>
            <span className="hidden h-8 w-px bg-white/20 sm:block" aria-hidden />
            <p className="flex items-center gap-2 text-sm text-violet-100">
              <span className="text-neon-gold" aria-hidden>
                <NeonGlyph name="trophy" />
              </span>
              {content.dressCodePrize}
            </p>
          </div>
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 text-sm tracking-widest text-neon-gold">
              <span aria-hidden>
                <NeonGlyph name="lock" />
              </span>
              {content.privateNote}
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-100/90">
              We&apos;re keeping this celebration exclusive. Every adult and child has to be
              registered by name. If a name isn&apos;t on the list, they can&apos;t come in.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function NeonGlyph({ name }: { name: GlyphName }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<GlyphName, ReactNode> = {
    skate: (
      <>
        <path d="M14 24c1-9 7-14 14-14h8c3 0 5 2 5 5v3c0 2-2 4-5 4H18" />
        <path d="M18 14c1 3 1 6 0 8M23 13c1 3 1 6 0 9M28 14c1 3 1 5 0 7" />
        <path d="M10 24h30" />
        <circle cx="15" cy="31" r="3" />
        <circle cx="23" cy="31" r="3" />
        <circle cx="31" cy="31" r="3" />
        <circle cx="38" cy="29" r="2.4" />
      </>
    ),
    dinner: (
      <>
        <path d="M18 8v14c0 3-2 5-4 5" />
        <path d="M18 16h-4" />
        <path d="M18 20h-4" />
        <path d="M18 28v12" />
        <path d="M30 8v32" />
        <path d="M30 18c4 0 6-2 6-6V8" />
      </>
    ),
    dj: (
      <>
        <path d="M10 28a14 14 0 0 1 28 0" />
        <rect x="8" y="26" width="8" height="12" rx="3" />
        <rect x="32" y="26" width="8" height="12" rx="3" />
        <path d="M16 32h-2M34 32h2" />
      </>
    ),
    hanger: (
      <>
        <path d="M24 10a3 3 0 1 1 0 6c-2 0-3 1-3 3" />
        <path d="M8 34l13-12 3 3 3-3 13 12" />
        <path d="M8 34h32" />
      </>
    ),
    trophy: (
      <>
        <path d="M16 10h16v8a8 8 0 0 1-16 0V10z" />
        <path d="M16 14H10c0 6 4 8 6 8" />
        <path d="M32 14h6c0 6-4 8-6 8" />
        <path d="M24 26v6" />
        <path d="M16 38h16" />
        <path d="M18 34h12l-1 4H19z" />
      </>
    ),
    lock: (
      <>
        <rect x="12" y="20" width="24" height="18" rx="3" />
        <path d="M18 20v-4a6 6 0 0 1 12 0v4" />
        <path d="M24 27v6" />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}
