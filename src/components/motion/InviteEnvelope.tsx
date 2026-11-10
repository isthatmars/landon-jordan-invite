"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crown } from "../icons";
import { skipIntro } from "./Cinematic";
import { INTRO_KEY } from "./introBoot";

type Phase = "hidden" | "glow" | "ready" | "opening" | "zoom" | "gone";

/** Physical envelope. Nothing opens until the guest asks. */
export function InviteEnvelope() {
  const [phase, setPhase] = useState<Phase>("glow");
  const timers = useRef<number[]>([]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro === "done") {
      setPhase("gone");
      return;
    }
    if (root.dataset.intro === "reveal") return;
    if (root.dataset.intro !== "invite" && root.dataset.intro !== "opening") {
      root.dataset.intro = "invite";
    }
    setPhase("glow");
    const ready = window.setTimeout(() => {
      setPhase((current) => (current === "glow" ? "ready" : current));
    }, 1500);
    timers.current.push(ready);
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (root.dataset.intro === "done") setPhase("gone");
    };
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["data-intro"] });
    return () => obs.disconnect();
  }, []);

  const open = () => {
    const root = document.documentElement;
    if (root.dataset.intro === "done") return;
    setPhase("opening");
    root.dataset.intro = "opening";
    const reveal = window.setTimeout(() => {
      root.style.setProperty("--intro-shift", "0ms");
      root.dataset.intro = "reveal";
      window.__ljIntroStart = Date.now();
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* private mode */
      }
      setPhase("zoom");
    }, 1700);
    const done = window.setTimeout(() => {
      skipIntro();
      setPhase("gone");
    }, 3900);
    timers.current.push(reveal, done);
  };

  if (phase === "hidden" || phase === "gone") return null;

  const openClass = phase === "opening" || phase === "zoom" ? " is-open" : "";
  const zoomClass = phase === "zoom" ? " is-zoom" : "";

  return (
    <div
      id="invite-envelope"
      className={`invite-overlay${phase === "ready" || phase === "opening" || phase === "zoom" ? " is-ready" : ""}${phase === "zoom" ? " is-zoom" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="You're invited"
    >
      <div className="invite-glow" aria-hidden />
      <p className="invite-kicker">You&apos;re Invited</p>
      <div className={`envelope${openClass}${zoomClass}`}>
        <div className="envelope-shadow" aria-hidden />
        <div className="envelope-shell">
          <div className="envelope-card">
            <p className="envelope-card-script">Landon &amp; Jordan&apos;s</p>
            <p className="envelope-card-title">80s Birthday Party</p>
            <p className="envelope-card-date">December 19, 2026</p>
          </div>
          <div className="envelope-pocket" aria-hidden />
          <div className="envelope-flap" aria-hidden />
          <div className="envelope-seal" aria-hidden>
            <Crown className="envelope-crown" />
          </div>
        </div>
      </div>
      <button type="button" id="open-invitation" className="invite-open" onClick={open}>
        Open your invitation
      </button>
    </div>
  );
}
