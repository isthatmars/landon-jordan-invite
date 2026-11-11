"use client";

import { useEffect, useRef, useState } from "react";

function playRing(ctx: AudioContext) {
  const start = ctx.currentTime + 0.02;
  const burst = (when: number, duration: number) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.11, when + 0.03);
    gain.gain.setValueAtTime(0.11, when + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    gain.connect(ctx.destination);
    for (const freq of [440, 480]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(when);
      osc.stop(when + duration + 0.02);
    }
  };
  burst(start, 0.36);
  burst(start + 0.5, 0.36);
}

export function RsvpTelephone() {
  const audio = useRef<AudioContext | null>(null);
  const greeted = useRef(false);
  const helpTimer = useRef<number | null>(null);
  const [pickedUp, setPickedUp] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const [greeting, setGreeting] = useState(false);

  useEffect(() => {
    const section = document.getElementById("rsvp");
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || greeted.current) return;
        greeted.current = true;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        setGreeting(true);
        window.setTimeout(() => setGreeting(false), 900);
      },
      { threshold: 0.35 },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      if (helpTimer.current != null) window.clearTimeout(helpTimer.current);
    };
  }, []);

  const goToFirstQuestion = () => {
    const attend = document.getElementById("rsvp-attend");
    const target = attend ?? document.getElementById("rsvp-form");
    if (!(target instanceof HTMLElement)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });

    const focusable =
      attend?.querySelector<HTMLElement>("button") ??
      target.querySelector<HTMLElement>("button, input, textarea");
    focusable?.focus({ preventScroll: true });
  };

  const pickup = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPickedUp(true);
    setBuzzing(!reduce);
    window.setTimeout(() => setBuzzing(false), 1100);

    /* One tap should help: ring, then bring the Yes/No question into view. */
    if (helpTimer.current != null) window.clearTimeout(helpTimer.current);
    helpTimer.current = window.setTimeout(
      () => {
        helpTimer.current = null;
        goToFirstQuestion();
      },
      reduce ? 0 : 420,
    );

    if (reduce) return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = audio.current ?? new Ctor();
    audio.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    playRing(ctx);
  };

  return (
    <div className="mx-auto mt-3 w-full max-w-[12.5rem]" data-testid="rsvp-phone">
      <button type="button" className="phone-hit" onClick={pickup} aria-label="Pick up the telephone">
        <span className={`phone-prop ${buzzing ? "is-buzzing" : ""} ${greeting ? "is-ring-once" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="phone-photo" src="/images/prop-rsvp-phone.png" alt="" draggable={false} />
        </span>
      </button>
      {pickedUp ? (
        <div className="rsvp-phone-copy mt-3 w-full max-w-full text-center" data-testid="rsvp-phone-message" aria-live="polite">
          <p className="text-sm leading-snug text-white">
            You&apos;re on the list?{" "}
            <button
              type="button"
              className="rsvp-official-cue"
              data-testid="rsvp-official-cue"
              onClick={goToFirstQuestion}
            >
              Let&apos;s make it official!
            </button>
          </p>
        </div>
      ) : null}
    </div>
  );
}
