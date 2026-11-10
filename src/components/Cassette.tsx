"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Track } from "@/lib/types";

/** Physical cassette jewel-case pile — not neon UI rows. */
export function Cassette({
  track,
  index,
  total,
  selected,
  inserting,
  onSelect,
}: {
  track: Track;
  index: number;
  total: number;
  selected: boolean;
  inserting: boolean;
  onSelect: () => void;
}) {
  // Overlapping pile: each tape mostly covers the one below, slight skew
  const restRotate = -3 + index * 0.7 + (index % 2 ? 1.4 : -1);
  // Enough offset that each handwritten label stays visible in the pile
  const restY = index * 58;
  const restX = index * 4 + (index % 2 ? 10 : -2);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={false}
      className="absolute left-1/2 w-[min(100%,310px)] -translate-x-1/2 border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50"
      style={{ top: 0, zIndex: inserting ? 50 : total - index + (selected ? 20 : 0) }}
      animate={
        inserting
          ? { x: "-70%", y: restY - 120, rotate: -32, scale: 0.4, opacity: 0.15 }
          : {
              x: `calc(-50% + ${restX}px)`,
              y: restY,
              rotate: selected ? restRotate - 1.5 : restRotate,
              scale: selected ? 1.05 : 1,
              opacity: 1,
            }
      }
      whileHover={
        inserting
          ? undefined
          : {
              rotate: restRotate + (index % 2 ? -5 : 5),
              y: restY - 10,
              x: `calc(-50% + ${restX + (index % 2 ? -14 : 14)}px)`,
              transition: { type: "spring", stiffness: 420, damping: 12 },
            }
      }
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      aria-label={`${track.artist} – ${track.title}`}
      aria-pressed={selected}
    >
      <span className="relative block">
        <Image
          src="/images/cassette-case-blank.png"
          alt=""
          width={620}
          height={350}
          className="pointer-events-none h-auto w-full select-none"
          style={{
            filter: "drop-shadow(0 16px 22px rgba(0,0,0,0.65))",
          }}
          draggable={false}
        />
        {/* Physical paper label — cream paper + colored ink handwriting */}
        <span
          className="pointer-events-none absolute left-[13%] right-[13%] top-[36%] flex h-[26%] flex-col justify-center overflow-hidden rounded-[1px] px-2.5 py-1"
          style={{
            background:
              "linear-gradient(180deg, #f7f0e1 0%, #efe6d2 55%, #e5d9c0 100%)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.25)",
          }}
        >
          <span
            className="block h-1 w-full mb-1 rounded-sm opacity-90"
            style={{ background: track.color }}
            aria-hidden
          />
          <span
            className="block truncate font-[family-name:var(--font-script)] text-[15px] leading-none sm:text-[17px]"
            style={{ color: track.color, transform: "rotate(-1deg)" }}
          >
            {track.artist} – {track.title}
          </span>
        </span>
      </span>
    </motion.button>
  );
}

export function CassetteStackHeight(count: number) {
  return 58 * Math.max(count - 1, 0) + 180;
}
