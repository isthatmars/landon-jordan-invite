"use client";

import { useEffect, useLayoutEffect } from "react";
import { INTRO_KEY } from "./introBoot";

declare global {
  interface Window {
    __ljIntroStart?: number;
  }
}

const SECTIONS = [
  ["mixtape", "seenMixtape", "liveMixtape"],
  ["watch", "seenWatch", "liveWatch"],
  ["arcade", "seenArcade", "liveArcade"],
  ["lineup", "seenLineup", "liveLineup"],
  ["rsvp", "seenRsvp", "liveRsvp"],
] as const;

function finishIntro() {
  const root = document.documentElement;
  document.getElementById("lj-intro-hold")?.remove();
  if (root.dataset.intro !== "play") return;
  root.dataset.intro = "done";
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function skipIntro() {
  const root = document.documentElement;
  document.getElementById("lj-intro-hold")?.remove();
  root.dataset.intro = "done";
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function Cinematic() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const hold = document.getElementById("lj-intro-hold");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      seen = false;
    }
    const home = location.pathname === "/";
    if (!home || reduced || seen) {
      root.dataset.intro = "done";
      root.dataset.motion = reduced ? "off" : "armed";
      hold?.remove();
      return;
    }

    const start = window.__ljIntroStart ?? Date.now();
    window.__ljIntroStart = start;
    const elapsed = Date.now() - start;
    if (elapsed >= 4100) {
      finishIntro();
      return;
    }
    // The boot script already started the CSS clock. Seeking here would replay it.
    if (root.dataset.intro !== "play") {
      root.style.setProperty("--intro-shift", `-${elapsed}ms`);
      root.dataset.intro = "play";
    }
    root.dataset.motion = "armed";
    hold?.remove();
    const timer = window.setTimeout(finishIntro, 4100 - elapsed);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.motion === "off") return;
    root.dataset.motion = "armed";

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (id === "home") {
            root.dataset.liveHome = entry.isIntersecting ? "1" : "0";
            continue;
          }
          const spec = SECTIONS.find((row) => row[0] === id);
          if (!spec) continue;
          const [, seenKey, liveKey] = spec;
          if (entry.isIntersecting) {
            root.dataset[seenKey] = "1";
            root.dataset[liveKey] = "1";
          } else if (root.dataset[seenKey] === "1") {
            root.dataset[liveKey] = "0";
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );

    const home = document.getElementById("home");
    if (home) io.observe(home);
    for (const [id] of SECTIONS) {
      const node = document.getElementById(id);
      if (node) io.observe(node);
    }
    return () => io.disconnect();
  }, []);

  return null;
}
