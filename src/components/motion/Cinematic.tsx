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
    document.getElementById("lj-intro-hold")?.remove();
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
      return;
    }
    if (!root.dataset.intro || root.dataset.intro === "play") {
      root.dataset.intro = "invite";
    }
    root.dataset.motion = "armed";
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
    const markVisible = () => {
      for (const [id, seenKey, liveKey] of SECTIONS) {
        const node = document.getElementById(id);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const ratio = rect.height > 0 ? visible / rect.height : 0;
        if (ratio >= 0.18) {
          root.dataset[seenKey] = "1";
          root.dataset[liveKey] = "1";
        } else if (root.dataset[seenKey] === "1") {
          root.dataset[liveKey] = "0";
        }
      }
    };
    markVisible();
    window.addEventListener("scroll", markVisible, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", markVisible);
    };
  }, []);

  return null;
}
