"use client";

import { useRef, useState } from "react";

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
  const [pickedUp, setPickedUp] = useState(false);
  const [buzzing, setBuzzing] = useState(false);

  const pickup = () => {
    setPickedUp(true);
    setBuzzing(true);
    window.setTimeout(() => setBuzzing(false), 1100);

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = audio.current ?? new Ctor();
    audio.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    playRing(ctx);
  };

  const scrollToQuestion = () => {
    const field = document.getElementById("rsvp-first");
    if (!(field instanceof HTMLElement)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    field.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    field.focus({ preventScroll: true });
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-[16.5rem]" data-testid="rsvp-phone">
      <button type="button" className="phone-hit" onClick={pickup} aria-label="Pick up the telephone">
        <span className={`phone-prop ${buzzing ? "is-buzzing" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="phone-base" src="/images/prop-rsvp-phone.png" alt="" draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="phone-handset" src="/images/prop-rsvp-phone.png" alt="" draggable={false} />
        </span>
      </button>
      {!pickedUp ? (
        <p className="mt-2 text-center text-[10px] font-bold tracking-[0.18em] text-[#c6ff00]">TAP THE PHONE</p>
      ) : (
        <div className="mt-3 text-center" data-testid="rsvp-phone-message" aria-live="polite">
          <p className="text-sm leading-snug text-white">You&apos;re on the list? Let&apos;s make it official!</p>
          <button type="button" className="btn-green-solid mt-3 px-4 py-2 text-[11px]" onClick={scrollToQuestion}>
            Answer the first question
          </button>
        </div>
      )}
    </div>
  );
}
