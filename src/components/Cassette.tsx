"use client";

import type { Track } from "@/lib/types";

/** Click target over one photographed case in the shared stack. */
export function Cassette({
  track,
  label,
  selected,
  inserting,
  onSelect,
  top,
  height,
  labelTop,
  labelHeight,
}: {
  track: Track;
  label: string;
  selected: boolean;
  inserting: boolean;
  onSelect: () => void;
  top: string;
  height: string;
  labelTop: string;
  labelHeight: string;
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
      className={`mix-tape${selected ? " is-on" : ""}${inserting ? " is-insert" : ""}`}
      style={{ top, height }}
    >
      <span className="mix-tape-ink" style={{ top: labelTop, height: labelHeight }}>
        {label}
      </span>
    </button>
  );
}
