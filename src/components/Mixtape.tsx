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

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] items-end px-2 pb-2 pt-16 sm:px-4 sm:pb-3 sm:pt-20">
        <div className="relative flex w-full items-end justify-center gap-1 sm:gap-3">
          <div className="absolute bottom-[94%] left-[22%] z-20 mb-1 flex items-end gap-1 sm:left-[34%]">
            <h2 className="neon-script-lg text-left text-[1.85rem] leading-[0.86] sm:text-[3.15rem]">
              {script}
            </h2>
            <NeonArrow className="mb-1 ml-1 h-8 w-11 shrink-0 sm:h-11 sm:w-16" />
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-headphones-80s.png"
            alt=""
            className="mb-1 hidden w-[11%] max-w-[130px] drop-shadow-[0_10px_8px_rgba(0,0,0,0.65)] min-[720px]:block"
            draggable={false}
          />

          <div className="relative w-[64%] max-w-[760px]" data-testid="boombox">
            <div className="floor-contact" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-boombox-front.png"
              alt="Chrome boombox with a cassette in the deck"
              className="relative block h-auto w-full"
              draggable={false}
            />
          </div>

          <div className="relative w-[34%] max-w-[320px] shrink-0">
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
