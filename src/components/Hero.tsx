"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import type { SiteContent } from "@/lib/types";
import { useLightParallax } from "./Parallax";

export function Hero({ content }: { content: SiteContent }) {
  const ref = useRef<HTMLElement>(null);
  const light = useLightParallax();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["0%", "18%"]);
  const coupleY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["0%", "8%"]);
  const textY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["0%", "22%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.2]);

  return (
    <section ref={ref} id="home" className="relative min-h-[100svh] w-full overflow-hidden">
      {/* Separate Miami night / palm background */}
      <motion.div className="absolute inset-[-6%] z-0" style={{ y: bgY }}>
        <Image
          src="/images/hero-bg-miami.jpg"
          alt=""
          fill
          priority
          className="object-cover object-[center_40%]"
          sizes="100vw"
        />
      </motion.div>
      {/* Readability gradients — do NOT fade the couple layer */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#05010fe6] via-transparent to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-0 z-[1] hidden bg-gradient-to-l from-[#05010ff0] via-[#05010f55] to-transparent md:block" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#05010f] via-transparent to-[#05010f33]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-6 pt-24 md:px-6">
        <div className="grid flex-1 items-end gap-2 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center">
          {/* Hard cutout couple — same faces, poster placement on the left */}
          <motion.div
            className="pointer-events-none relative order-2 flex items-end justify-center md:order-1 md:justify-start"
            style={{ y: coupleY }}
          >
            <div
              aria-hidden
              className="absolute bottom-[2%] left-1/2 z-0 h-[8%] w-[70%] -translate-x-1/2 rounded-[100%] bg-black/70 blur-2xl md:left-[42%]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-couple-cutout.png?v=hard2"
              alt="Landon and Jordan in 80s windbreakers"
              className="relative z-[1] max-h-[42svh] w-auto max-w-full object-contain object-bottom md:max-h-[62svh]"
              style={{
                opacity: 1,
                mixBlendMode: "normal",
                isolation: "isolate",
                filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.9))",
              }}
              draggable={false}
            />
          </motion.div>

          <motion.div
            className="order-1 md:order-2 md:text-right"
            style={{ y: textY, opacity: textOpacity }}
          >
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="mb-1 block text-2xl text-neon-gold drop-shadow-[0_0_10px_#ffd700] md:text-3xl" aria-hidden>
                ♛
              </span>
              <h1 className="neon-script-lg text-4xl leading-none sm:text-5xl md:text-6xl">
                {content.heroScript}
              </h1>

              <motion.p
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.7 }}
                className="chrome-80s my-1 text-[22vw] sm:text-8xl md:ml-auto md:text-[6.5rem] lg:text-[8rem]"
                aria-label="80s"
              >
                {content.heroChrome}
              </motion.p>

              <p className="mb-4 text-sm font-semibold tracking-[0.35em] text-white sm:text-base">
                {content.heroSubtitle}
              </p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="neon-script-lg flicker-in text-3xl underline decoration-neon-pink/80 underline-offset-8 sm:text-4xl"
              >
                {content.heroInvite}
              </motion.p>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="glass-bar relative z-20 mt-4 flex flex-col gap-4 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="flex flex-col gap-3 text-sm font-semibold tracking-wide sm:flex-row sm:gap-8">
            <Detail label={content.eventDate} kind="date" />
            <Detail
              label={content.eventVenue}
              detail={content.eventAddress}
              kind="pin"
            />
            <Detail label={content.eventTime} kind="time" />
          </div>
          <a href="#rsvp" className="btn-green whitespace-nowrap text-center">
            RSVP NOW &gt;
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function Detail({
  label,
  detail,
  kind,
}: {
  label: string;
  detail?: string;
  kind: "date" | "pin" | "time";
}) {
  const icon =
    kind === "date" ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ) : kind === "pin" ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  return (
    <div className="flex items-center gap-2">
      <span className="text-neon-pink" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block">{label}</span>
        {detail ? (
          <span className="block text-[11px] font-medium tracking-normal text-violet-200/90">
            {detail}
          </span>
        ) : null}
      </span>
    </div>
  );
}
