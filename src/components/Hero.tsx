"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { SiteContent } from "@/lib/types";

export function Hero({ content }: { content: SiteContent }) {
  return (
    <section id="home" className="relative min-h-[100svh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/hero-couple.jpg"
          alt="Landon and Jordan in 80s windbreakers at Miami night"
          fill
          priority
          className="object-cover object-[center_30%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05010ff2] via-[#05010fcc] to-[#05010f55]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05010f] via-transparent to-[#05010f66]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-28 pt-28 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-neon-gold text-2xl drop-shadow-[0_0_10px_#ffd700]" aria-hidden>
              ♛
            </span>
            <h1 className="neon-script-lg text-4xl sm:text-5xl md:text-6xl leading-none">
              {content.heroScript}
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="chrome-80s text-[5.5rem] sm:text-[7.5rem] md:text-[9rem] my-1"
            aria-label="80s"
          >
            {content.heroChrome}
          </motion.p>

          <p className="text-white tracking-[0.35em] text-sm sm:text-base font-semibold mb-4">
            {content.heroSubtitle}
          </p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="neon-script-lg flicker-in text-3xl sm:text-4xl underline decoration-neon-pink/80 underline-offset-8"
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
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-8 text-sm font-semibold tracking-wide">
            <Detail icon="📅" label={content.eventDate} />
            <Detail icon="📍" label={content.eventVenue} />
            <Detail icon="🕒" label={content.eventTime} />
          </div>
          <a href="#rsvp" className="btn-green text-center whitespace-nowrap">
            RSVP NOW &gt;
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function Detail({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neon-pink" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}
