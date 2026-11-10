"use client";

import { useEffect, useState } from "react";
import { Cassette } from "./Cassette";
import { NeonArrow } from "./icons";
import { usePlayback } from "./Playback";

const STACK: {
  id: string;
  label: string;
  top: string;
  height: string;
  labelTop: string;
  labelHeight: string;
}[] = [
  { id: "t1", label: "Michael Jackson – Beat It", top: "0%", height: "20.2%", labelTop: "34%", labelHeight: "50%" },
  { id: "t2", label: "My Cadillac Got That Bass", top: "20.2%", height: "15.2%", labelTop: "18%", labelHeight: "62%" },
  { id: "t3", label: "RUN-D.M.C. – Sucker M.C's", top: "35.4%", height: "15.7%", labelTop: "16%", labelHeight: "64%" },
  { id: "t5", label: "Salt-N-Pepa – Push It", top: "51.1%", height: "15.2%", labelTop: "16%", labelHeight: "62%" },
  { id: "t6", label: "Miami Sound Machine – Conga", top: "66.3%", height: "15.7%", labelTop: "18%", labelHeight: "58%" },
  { id: "t7", label: "Prince – Purple Rain", top: "82.0%", height: "18%", labelTop: "8%", labelHeight: "50%" },
];

function TransportIcon({ name }: { name: "back" | "play" | "pause" | "forward" | "stop" }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "mix-key-icon",
    "aria-hidden": true as const,
  };
  if (name === "back") {
    return (
      <svg {...common}>
        <path d="M11.2 6.2 4.8 12l6.4 5.8V6.2zm8 0L12.8 12l6.4 5.8V6.2z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "play") {
    return (
      <svg {...common}>
        <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "pause") {
    return (
      <svg {...common}>
        <rect x="6.5" y="5.5" width="3.8" height="13" rx="0.6" fill="currentColor" />
        <rect x="13.7" y="5.5" width="3.8" height="13" rx="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (name === "forward") {
    return (
      <svg {...common}>
        <path d="M12.8 6.2 19.2 12l-6.4 5.8V6.2zM4.8 6.2 11.2 12l-6.4 5.8V6.2z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Mixtape({ headline }: { headline: string }) {
  const { tracks, now, selectTape, insertingId, playing, engaged, toggleDeck, stop, stepTape } =
    usePlayback();
  const [flyer, setFlyer] = useState<{
    label: string;
    left: number;
    top: number;
    width: number;
    height: number;
    x: string;
    y: string;
  } | null>(null);
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const stack = STACK.flatMap((row) => {
    const track = byId.get(row.id);
    return track ? [{ ...row, track }] : [];
  });
  const loadedId = now?.trackId ?? "";

  useEffect(() => {
    if (!insertingId) return;
    const from = document.querySelector<HTMLElement>(`#mixtape .mix-tape[data-track-id="${insertingId}"]`);
    const deck = document.querySelector<HTMLElement>("[data-testid='boombox']");
    if (!from || !deck) return;
    const tape = from.getBoundingClientRect();
    const stereo = deck.getBoundingClientRect();
    const endX = stereo.left + stereo.width * 0.42;
    const endY = stereo.top + stereo.height * 0.46;
    const row = STACK.find((item) => item.id === insertingId);
    setFlyer({
      label: row?.label ?? "Tape",
      left: tape.left,
      top: tape.top,
      width: tape.width,
      height: Math.max(tape.height, 28),
      x: `${endX - tape.left}px`,
      y: `${endY - tape.top}px`,
    });
  }, [insertingId]);
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
    <section id="mixtape" data-track-id={loadedId} className="mix-scene scene-section">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/scene-mixtape-plate.jpg" alt="" className="mix-plate" />
      <div className="mix-neon-throw" aria-hidden />
      <div className="mix-table-pool" aria-hidden />

      <div className="mix-stage">
        <div className="mix-script">
          <h2 className="neon-script-lg">{script}</h2>
          <NeonArrow className="mix-arrow" />
        </div>

        <div className="mix-row">
          <div className="mix-boom" data-testid="boombox">
            <div className="mix-shadow" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-boombox-scene.png"
              alt="Chrome boombox with a cassette in the deck"
              className="mix-photo"
              draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-boombox-reflection.png"
              alt=""
              className="mix-mirror"
              draggable={false}
            />
            <div
              className="mix-grade"
              aria-hidden
              style={{ maskImage: "url(/images/prop-boombox-scene.png)", WebkitMaskImage: "url(/images/prop-boombox-scene.png)" }}
            />
            <div className={`mix-deck${playing ? " is-live" : ""}`} aria-hidden>
              <span className="mix-reel mix-reel-l" />
              <span className="mix-reel mix-reel-r" />
              <span className="mix-eq">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="mix-lamp" />
            </div>
            <div className="mix-keys" role="group" aria-label="Boombox transport">
              <button
                type="button"
                className="mix-key"
                aria-label="Previous tape"
                onClick={() => stepTape(-1)}
              >
                <TransportIcon name="back" />
              </button>
              <button
                type="button"
                className={`mix-key${playing ? " is-down" : ""}`}
                aria-label="Play the tape"
                aria-pressed={playing}
                onClick={() => {
                  if (!playing) toggleDeck();
                }}
              >
                <TransportIcon name="play" />
              </button>
              <button
                type="button"
                className={`mix-key${!playing && engaged ? " is-down" : ""}`}
                aria-label="Pause the tape"
                aria-pressed={!playing && engaged}
                onClick={() => {
                  if (playing) toggleDeck();
                }}
              >
                <TransportIcon name="pause" />
              </button>
              <button
                type="button"
                className="mix-key"
                aria-label="Next tape"
                onClick={() => stepTape(1)}
              >
                <TransportIcon name="forward" />
              </button>
              <button type="button" className="mix-key" aria-label="Stop the tape" onClick={stop}>
                <TransportIcon name="stop" />
              </button>
            </div>
            <div className="mix-phones">
              <div className="mix-shadow mix-shadow-phones" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/prop-headphones-80s.png"
                alt=""
                className="mix-photo mix-reflect-short"
                draggable={false}
              />
              <div
                className="mix-grade mix-grade-phones"
                aria-hidden
                style={{
                  maskImage: "url(/images/prop-headphones-80s.png)",
                  WebkitMaskImage: "url(/images/prop-headphones-80s.png)",
                }}
              />
            </div>
          </div>

          <div className="mix-stack">
            <div className="mix-shadow mix-shadow-stack" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/cassette-stack-cut.png"
              alt=""
              className="mix-photo mix-reflect"
              draggable={false}
            />
            <div
              className="mix-grade mix-grade-stack"
              aria-hidden
              style={{
                maskImage: "url(/images/cassette-stack-cut.png)",
                WebkitMaskImage: "url(/images/cassette-stack-cut.png)",
              }}
            />
            {stack.map((row) => (
              <Cassette
                key={row.id}
                track={row.track}
                label={row.label}
                top={row.top}
                height={row.height}
                labelTop={row.labelTop}
                labelHeight={row.labelHeight}
                selected={row.id === loadedId}
                inserting={insertingId === row.id}
                onSelect={() => selectTape(row.id)}
              />
            ))}
          </div>
        </div>
      </div>
      {flyer ? (
        <span
          className="mix-flyer"
          aria-hidden
          style={{
            left: flyer.left,
            top: flyer.top,
            width: flyer.width,
            height: flyer.height,
            ["--fly-x" as string]: flyer.x,
            ["--fly-y" as string]: flyer.y,
          }}
        >
          {flyer.label}
        </span>
      ) : null}
    </section>
  );
}
