"use client";

import { useEffect, useState } from "react";
import { onScrollFrame } from "@/lib/activePlate";
import { usePlayback } from "./Playback";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const { playing, toggleCurrent } = usePlayback();

  useEffect(() => {
    const hero = document.getElementById("home");
    let lastVisible = false;

    const update = () => {
      const threshold = hero ? hero.offsetHeight * 0.72 : window.innerHeight * 0.85;
      const next = window.scrollY > threshold;
      if (next === lastVisible) return;
      lastVisible = next;
      setVisible(next);
    };

    const onScroll = onScrollFrame(update);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className={`site-float-dock${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      <button
        type="button"
        className="site-float-btn site-float-pause"
        aria-label={playing ? "Pause music" : "Play music"}
        tabIndex={visible ? 0 : -1}
        onClick={() => toggleCurrent()}
      >
        {playing ? <PauseGlyph /> : <PlayGlyph />}
        <span className="site-float-label">{playing ? "PAUSE" : "PLAY"}</span>
      </button>
      <a
        href="#home"
        className="site-float-btn site-float-top"
        aria-label="Back to top"
        tabIndex={visible ? 0 : -1}
        onClick={(event) => {
          const prefersReduced =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (prefersReduced) return;
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          if (typeof history !== "undefined") {
            history.replaceState(null, "", "#home");
          }
        }}
      >
        <span aria-hidden>↑</span>
        <span className="site-float-label">TOP</span>
      </a>
    </div>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="site-float-icon" aria-hidden>
      <rect x="6.5" y="5.5" width="3.8" height="13" rx="0.6" fill="currentColor" />
      <rect x="13.7" y="5.5" width="3.8" height="13" rx="0.6" fill="currentColor" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="site-float-icon" aria-hidden>
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
    </svg>
  );
}
