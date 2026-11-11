"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveFlag } from "@/lib/useLiveFlag";
import { TapHand } from "./icons";

/** Once-per-session dismiss for the RSVP telephone tap guidance. */
const RSVP_PHONE_CUES_KEY = "lj-rsvp-phone-cues";

function readPhoneCueDismissed() {
  try {
    return sessionStorage.getItem(RSVP_PHONE_CUES_KEY) === "1";
  } catch {
    return false;
  }
}

function writePhoneCueDismissed() {
  try {
    sessionStorage.setItem(RSVP_PHONE_CUES_KEY, "1");
  } catch {
    /* private mode / blocked storage */
  }
}

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
  const cueTimer = useRef<number | null>(null);
  const helpTimer = useRef<number | null>(null);
  const [pickedUp, setPickedUp] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const rsvpLive = useLiveFlag("liveRsvp");
  const [rsvpInView, setRsvpInView] = useState(false);
  /* Start dismissed until sessionStorage hydrates — avoids a first-paint flash. */
  const [cueDismissed, setCueDismissed] = useState(true);
  const [cueReady, setCueReady] = useState(false);

  useEffect(() => {
    setCueDismissed(readPhoneCueDismissed());
    setCueReady(true);
  }, []);

  useEffect(() => {
    const section = document.getElementById("rsvp");
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setRsvpInView(entry.isIntersecting);
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
      if (cueTimer.current != null) window.clearTimeout(cueTimer.current);
      if (helpTimer.current != null) window.clearTimeout(helpTimer.current);
    };
  }, []);

  const showPhoneCue = cueReady && rsvpLive && rsvpInView && !cueDismissed;

  const dismissPhoneCue = () => {
    if (cueDismissed) return;
    setCueDismissed(true);
    writePhoneCueDismissed();
  };

  const cueFirstQuestion = () => {
    const attend = document.getElementById("rsvp-attend");
    const step = document.querySelector<HTMLElement>("#rsvp-form .rsvp-step-1");
    const target = attend ?? document.getElementById("rsvp-form");
    if (!(target instanceof HTMLElement)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });

    if (step) {
      step.classList.add("is-cue-lit");
      if (cueTimer.current != null) window.clearTimeout(cueTimer.current);
      cueTimer.current = window.setTimeout(() => {
        step.classList.remove("is-cue-lit");
        cueTimer.current = null;
      }, 1800);
    }

    const focusable =
      attend?.querySelector<HTMLElement>("button") ??
      target.querySelector<HTMLElement>("button, input, textarea");
    focusable?.focus({ preventScroll: true });
  };

  const pickup = () => {
    dismissPhoneCue();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPickedUp(true);
    setBuzzing(!reduce);
    window.setTimeout(() => setBuzzing(false), 1100);

    /* One tap should help: ring, then draw attention to Yes/No. */
    if (helpTimer.current != null) window.clearTimeout(helpTimer.current);
    helpTimer.current = window.setTimeout(
      () => {
        helpTimer.current = null;
        cueFirstQuestion();
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
    <div
      className={`mx-auto mt-3 w-full max-w-[12.5rem]${showPhoneCue ? " is-guiding" : ""}`}
      data-testid="rsvp-phone"
      data-phone-cues={showPhoneCue ? "1" : "0"}
    >
      <button
        type="button"
        className={`phone-hit${showPhoneCue ? " is-guiding" : ""}`}
        onClick={pickup}
        aria-label="Pick up the telephone"
      >
        <span className={`phone-prop ${buzzing ? "is-buzzing" : ""} ${greeting ? "is-ring-once" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="phone-photo" src="/images/prop-rsvp-phone.png" alt="" draggable={false} />
          {showPhoneCue ? (
            <span className="phone-tap-cue" aria-hidden>
              <TapHand className="phone-tap-hand" />
            </span>
          ) : null}
        </span>
        {showPhoneCue ? (
          <span className="phone-tap-hint" role="status">
            Tap the phone
          </span>
        ) : null}
      </button>
      {pickedUp ? (
        <div className="rsvp-phone-copy mt-3 w-full max-w-full text-center" data-testid="rsvp-phone-message" aria-live="polite">
          <p className="text-sm leading-snug text-white">
            You&apos;re on the list?{" "}
            <button
              type="button"
              className="rsvp-official-cue"
              data-testid="rsvp-official-cue"
              onClick={cueFirstQuestion}
            >
              Let&apos;s make it official!
            </button>
          </p>
        </div>
      ) : null}
    </div>
  );
}
