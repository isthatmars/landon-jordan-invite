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
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05010f] via-transparent to-[#05010f]" />

      <div className="relative z-10 mx-auto grid max-w-[1100px] items-center gap-6 px-3 py-6 sm:px-5 min-[640px]:grid-cols-[1.25fr_0.62fr] min-[640px]:py-8">
        <div>
          <div className="mb-3 flex items-end justify-center gap-1 min-[640px]:justify-start">
            <h2 className="neon-script-lg text-center text-[1.85rem] leading-[0.95] min-[640px]:text-left sm:text-[2.35rem]">
              {script}
            </h2>
            <NeonArrow className="mb-1 h-8 w-11 shrink-0 drop-shadow-[0_0_8px_#ff4fd8]" />
          </div>
          <div className="relative mx-auto w-full max-w-[560px]" data-testid="boombox">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-boombox-front.png"
            alt="Chrome boombox with a cassette in the deck"
            className="block h-auto w-full drop-shadow-[0_28px_30px_rgba(0,0,0,0.65)]"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-headphones-80s.png"
            alt=""
            className="pointer-events-none absolute -left-1 bottom-[4%] w-[26%] drop-shadow-2xl min-[640px]:-left-4"
            draggable={false}
          />
          </div>
        </div>

        <div className="flex justify-center min-[640px]:justify-end">
          <div className="flex flex-col items-center pb-2">
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
