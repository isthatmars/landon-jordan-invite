"use client";

import { motion } from "framer-motion";
import type { Track } from "@/lib/types";

/** Photoreal-ish horizontal cassette case with handwritten label (HTML text). */
export function Cassette({
  track,
  index,
  selected,
  inserting,
  onSelect,
}: {
  track: Track;
  index: number;
  selected: boolean;
  inserting: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      initial={false}
      whileHover={{ x: 10, rotate: -1.5, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      animate={
        inserting
          ? { x: -120, y: -40, rotate: -18, scale: 0.55, opacity: 0.35 }
          : selected
            ? { x: 8, scale: 1.04, boxShadow: "0 0 22px #ff2bd680" }
            : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
      }
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative block w-full max-w-[280px] text-left"
      style={{ zIndex: selected ? 20 : 10 - index }}
      aria-pressed={selected}
    >
      <div
        className="relative overflow-hidden rounded-[6px] border border-white/30 shadow-[0_12px_28px_#000a]"
        style={{
          background: `linear-gradient(135deg, ${track.color}cc, ${track.color}55 40%, #111 100%)`,
        }}
      >
        <div className="m-[6px] rounded-[3px] border border-black/40 bg-[#0c0c10]">
          <div className="relative flex h-[58px] items-center gap-3 px-3 sm:h-[64px]">
            <div className="flex gap-3">
              <Reel spinning={selected} />
              <Reel spinning={selected} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="tape-label truncate text-[15px] text-white drop-shadow sm:text-[17px]"
                style={{ textShadow: "0 0 8px #000" }}
              >
                {track.artist} – {track.title}
              </p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/70">
                Side A · Tape {index + 1}
              </p>
            </div>
          </div>
          <div
            className="h-2 w-full"
            style={{ background: track.color, boxShadow: `0 0 12px ${track.color}` }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
      </div>
    </motion.button>
  );
}

function Reel({ spinning }: { spinning: boolean }) {
  return (
    <motion.span
      className="relative block h-7 w-7 rounded-full border border-zinc-500 bg-gradient-to-br from-zinc-200 to-zinc-500 shadow-inner"
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={
        spinning ? { duration: 1.1, repeat: Infinity, ease: "linear" } : { duration: 0.3 }
      }
    >
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-800" />
      <span className="absolute inset-[3px] rounded-full border border-dashed border-zinc-600/80" />
    </motion.span>
  );
}
