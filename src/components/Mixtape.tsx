"use client";

import { Cassette } from "./Cassette";
import { NeonArrow } from "./icons";
import { usePlayback } from "./Playback";

const STACK: { id: string; label: string; color: string }[] = [
  { id: "t1", label: "Michael Jackson – Beat It", color: "#f43f5e" },
  { id: "t2", label: "My Cadillac Got That Bass", color: "#86efac" },
  { id: "t3", label: "RUN-D.M.C. – Sucker M.C's", color: "#60a5fa" },
  { id: "t5", label: "Salt-N-Pepa – Push It", color: "#f9a8d4" },
  { id: "t6", label: "Miami Sound Machine – Conga", color: "#fde047" },
  { id: "t7", label: "Prince – Purple Rain", color: "#d8b4fe" },
];

export function Mixtape({ headline }: { headline: string }) {
  const { tracks, now, selectTape } = usePlayback();
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const stack = STACK.flatMap((row) => {
    const track = byId.get(row.id);
    return track ? [{ ...track, color: row.color, stackLabel: row.label }] : [];
  });
  const loadedId = now?.trackId ?? "";
  const [lead, ...rest] = headline.split(/ and /i);
  const script = rest.length ? (
    <>
      {lead}
      <br />
      and {rest.join(" and ")}
    </>
  ) : (
    headline
  );

  return (
    <section id="mixtape" data-track-id={loadedId} className="scene-section relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/scene-mixtape-table.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_88%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#05010f] to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1000px] items-end px-2 pb-3 pt-14 sm:px-6 sm:pb-12 sm:pt-24">
        <div className="relative flex w-full items-end justify-center gap-2 sm:gap-4">
          <div className="absolute bottom-full left-[28%] z-20 mb-2 flex items-end gap-1 sm:left-[40%]">
            <h2 className="neon-script-lg text-left text-[1.4rem] leading-[0.9] min-[640px]:text-[2.2rem]">
              {script}
            </h2>
            <NeonArrow className="mb-0.5 h-7 w-9 shrink-0 drop-shadow-[0_0_8px_#ff4fd8] sm:h-9 sm:w-12" />
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-headphones-80s.png"
            alt=""
            className="mb-1 w-[16%] max-w-[120px] drop-shadow-[0_10px_8px_rgba(0,0,0,0.65)]"
            draggable={false}
          />

          <div className="relative w-[50%] max-w-[500px]" data-testid="boombox">
            <div className="floor-contact" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-boombox-front.png"
              alt="Chrome boombox with a cassette in the deck"
              className="relative block h-auto w-full"
              draggable={false}
            />
          </div>

          <div className="relative w-[28%] max-w-[210px] shrink-0">
            <div className="floor-contact" />
            {stack.map((track, index) => (
              <Cassette
                key={track.id}
                track={track}
                index={index}
                label={track.stackLabel}
                selected={track.id === loadedId}
                inserting={false}
                onSelect={() => selectTape(track.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
