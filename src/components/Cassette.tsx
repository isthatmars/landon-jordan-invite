"use client";

import type { Track } from "@/lib/types";

/** Straight pile. Each case sits low enough that the sticker above it stays visible. */
export function Cassette({
  track,
  index,
  label,
  selected,
  inserting,
  onSelect,
}: {
  track: Track;
  index: number;
  label?: string;
  selected: boolean;
  inserting: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${track.artist} – ${track.title}`}
      aria-pressed={selected}
      data-track-id={track.id}
      data-youtube-id={track.youtubeId}
      data-selected={selected ? "true" : "false"}
      className={`relative block w-[172px] max-w-full border-0 bg-transparent p-0 outline-none transition-transform duration-500 focus-visible:ring-2 focus-visible:ring-pink-400/70 ${
        index === 0 ? "" : "-mt-[44px]"
      } ${inserting ? "-translate-x-24 -rotate-12 scale-90 opacity-30" : ""} ${
        selected ? "z-30" : ""
      }`}
      style={{ zIndex: inserting ? 40 : index + 1 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/cassette-face.png"
        alt=""
        draggable={false}
        className="pointer-events-none block h-auto w-full select-none"
        style={{
          filter: selected
            ? "drop-shadow(0 0 12px rgba(255,43,214,0.95))"
            : "drop-shadow(0 8px 10px rgba(0,0,0,0.55))",
        }}
      />
      <span
        className="pointer-events-none absolute left-[8%] right-[8%] top-[22%] flex h-[16%] items-center overflow-hidden px-0.5"
        style={{ background: track.color }}
      >
        <span className="block w-full truncate text-center font-[family-name:var(--font-script)] text-[10px] leading-none text-[#1a1020]">
          {label ?? `${track.artist} – ${track.title}`}
        </span>
      </span>
    </button>
  );
}
