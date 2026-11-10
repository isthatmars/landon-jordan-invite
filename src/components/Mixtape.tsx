"use client";

import { useEffect, useState } from "react";
import { Cassette } from "./Cassette";
import { usePlayback } from "./Playback";

export function Mixtape({ headline }: { headline: string }) {
  const {
    tracks,
    now,
    playing,
    engaged,
    insertingId,
    selectTape,
    stepTape,
    toggleDeck,
    stop,
    replay,
    seek,
    readTime,
    transportRevision,
  } = usePlayback();
  const loaded = tracks.find((track) => track.id === now?.trackId) ?? null;
  const caption = loaded
    ? `${loaded.artist} — ${loaded.title}`
    : engaged && now
      ? `${now.artist} — ${now.title}`
      : "Pick a tape";
  const showDeck = Boolean(loaded) || (engaged && playing);

  return (
    <section id="mixtape" data-track-id={loaded?.id ?? ""} className="scene-section relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/scene-mixtape-table.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05010f] via-transparent to-[#05010f]" />

      <div className="relative z-10 mx-auto grid max-w-[1100px] items-end gap-6 px-3 py-16 sm:px-5 min-[720px]:grid-cols-[1.15fr_0.85fr] min-[720px]:py-20">
        <div>
          <div className="relative mx-auto w-full max-w-[560px]" data-testid="boombox">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-boombox-front.png"
              alt="Chrome boombox"
              className="block h-auto w-full drop-shadow-[0_28px_30px_rgba(0,0,0,0.65)]"
              draggable={false}
            />
            {showDeck ? (
              <div
                className="pointer-events-none absolute left-[38%] top-[45.5%] z-10 h-[15%] w-[24%] overflow-hidden"
                data-deck="cassette"
                data-spinning={playing ? "true" : "false"}
                aria-hidden
              >
                {loaded ? (
                  <span
                    className="absolute inset-x-[8%] top-[6%] h-[22%] truncate rounded-[1px] text-center font-[family-name:var(--font-script)] text-[8px] leading-[1.7] text-[#1a1020]"
                    style={{ background: loaded.color }}
                  >
                    {loaded.title}
                  </span>
                ) : null}
                <span className="absolute inset-x-0 top-[58%] flex -translate-y-1/2 items-center justify-center gap-7">
                  <DeckReel spinning={playing} />
                  <DeckReel spinning={playing} />
                </span>
              </div>
            ) : null}
            {insertingId && loaded ? (
              <div className="tape-insert absolute left-[36%] top-[40%] z-20 w-[28%]" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/cassette-face.png" alt="" className="h-auto w-full" />
                <span
                  className="absolute left-[12%] right-[12%] top-[22%] h-[16%]"
                  style={{ background: loaded.color }}
                />
              </div>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/prop-headphones-80s.png"
              alt=""
              className="pointer-events-none absolute -left-2 bottom-[2%] w-[30%] drop-shadow-2xl min-[720px]:-left-6"
              draggable={false}
            />
          </div>

          <div className="mx-auto mt-4 max-w-[560px]">
            <p className="text-[10px] uppercase tracking-[0.25em] text-neon-teal">Now playing</p>
            <p className="text-lg font-semibold">{caption}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => stepTape(-1)}>
                ⏮ PREV
              </button>
              <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => replay()}>
                ↺ REPLAY
              </button>
              <button type="button" onClick={toggleDeck} className="btn-green text-sm">
                {playing ? "❚❚ PAUSE" : "▶ PLAY"}
              </button>
              <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={stop}>
                ■ STOP
              </button>
              <button type="button" className="btn-pink-outline px-3 py-2 text-xs" onClick={() => stepTape(1)}>
                NEXT ⏭
              </button>
            </div>
            <DeckScrubber
              playing={playing}
              mediaKey={now?.youtubeId ?? ""}
              transportRevision={transportRevision}
              readTime={readTime}
              seek={seek}
            />
          </div>
        </div>

        <div className="flex flex-col items-center min-[720px]:items-start">
          <h2 className="neon-script-lg mb-4 text-center text-[2.1rem] leading-[0.95] min-[720px]:text-left sm:text-5xl">
            {headline}
          </h2>
          <div className="flex flex-col items-center pb-2">
            {tracks.map((track, index) => (
              <Cassette
                key={track.id}
                track={track}
                index={index}
                selected={track.id === loaded?.id}
                inserting={insertingId === track.id}
                onSelect={() => selectTape(track.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckReel({ spinning }: { spinning: boolean }) {
  return (
    <span
      className={`deck-reel relative block h-5 w-5 rounded-full border border-zinc-200/80 bg-zinc-950 sm:h-6 sm:w-6 ${
        spinning ? "deck-reel-spin" : ""
      }`}
      style={spinning ? { boxShadow: "0 0 8px #39ff14" } : undefined}
    >
      <span className="absolute left-1/2 top-[10%] h-[36%] w-px -translate-x-1/2 bg-zinc-100" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100" />
    </span>
  );
}

function DeckScrubber({
  playing,
  mediaKey,
  transportRevision,
  readTime,
  seek,
}: {
  playing: boolean;
  mediaKey: string;
  transportRevision: number;
  readTime: () => { current: number; duration: number };
  seek: (seconds: number) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const resetKey = `${mediaKey}:${transportRevision}`;
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setProgress(0);
    setDuration(0);
  }

  useEffect(() => {
    if (!playing) return;
    let active = true;
    const timer = window.setInterval(() => {
      if (!active) return;
      const time = readTime();
      setProgress(time.current);
      setDuration(time.duration);
    }, 400);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [playing, mediaKey, readTime]);

  return (
    <>
      <label className="mt-3 block">
        <span className="sr-only">Playback position</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(progress, duration || 0)}
          onChange={(event) => {
            const next = Number(event.target.value);
            setProgress(next);
            seek(next);
          }}
          className="w-full accent-pink-500"
        />
      </label>
      <p className="mt-1 text-[11px] text-violet-300">
        Official video plays on the TV. {formatTime(progress)} / {formatTime(duration)}
      </p>
    </>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.floor(seconds);
  const min = Math.floor(whole / 60);
  const sec = String(whole % 60).padStart(2, "0");
  return `${min}:${sec}`;
}
