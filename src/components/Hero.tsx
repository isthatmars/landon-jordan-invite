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
  const bgY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["0%", "22%"]);
  const coupleY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["0%", "10%"]);
  const coupleX = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["0%", "-3%"]);
  const textY = useTransform(scrollYProgress, [0, 1], light ? ["0%", "0%"] : ["0%", "28%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.15]);

  return (
    <section ref={ref} id="home" className="relative min-h-[100svh] w-full overflow-hidden">
      {/* Layer 1 — Miami night / palms */}
      <motion.div className="absolute inset-[-8%] z-0" style={{ y: bgY }}>
        <Image
          src="/images/hero-bg-miami.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05010ff0] via-[#05010f88] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05010f] via-transparent to-[#05010f55]" />
      </motion.div>

      {/* Layer 2 — birthday boys cutout (strong presence, left/center) */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-[-4%] right-0 z-[2] md:left-[8%] lg:left-[18%]"
        style={{ y: coupleY, x: coupleX }}
      >
        <div className="relative h-full w-full max-w-[920px]">
          <Image
            src="/images/hero-couple-cutout.png"
            alt="Landon and Jordan in 80s windbreakers"
            fill
            priority
            className="object-contain object-bottom drop-shadow-[0_20px_50px_#000c]"
            sizes="(max-width:768px) 100vw, 70vw"
          />
        </div>
      </motion.div>

      {/* Soft floor glow under couple */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[8%] left-[10%] z-[3] h-24 w-[50%] max-w-xl rounded-[100%] bg-fuchsia-500/25 blur-3xl"
      />

      {/* Layer 3 — typography */}
      <motion.div
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-28 pt-28 md:px-6"
        style={{ y: textY, opacity: textOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl text-neon-gold drop-shadow-[0_0_10px_#ffd700]" aria-hidden>
              ♛
            </span>
            <h1 className="neon-script-lg text-4xl leading-none sm:text-5xl md:text-6xl">
              {content.heroScript}
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="chrome-80s my-1 text-[5.5rem] sm:text-[7.5rem] md:text-[9rem]"
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

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="glass-bar mt-10 flex flex-col gap-4 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="flex flex-col gap-3 text-sm font-semibold tracking-wide sm:flex-row sm:gap-8">
            <Detail label={content.eventDate} kind="date" />
            <Detail label={content.eventVenue} kind="pin" />
            <Detail label={content.eventTime} kind="time" />
          </div>
          <a href="#rsvp" className="btn-green whitespace-nowrap text-center">
            RSVP NOW &gt;
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Detail({
  label,
  kind,
}: {
  label: string;
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
      <span>{label}</span>
    </div>
  );
}
