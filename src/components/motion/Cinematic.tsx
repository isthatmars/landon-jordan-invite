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

const HASH_SECTIONS = new Set(["home", "mixtape", "watch", "arcade", "lineup", "rsvp"]);

function intentionalHash(): string | null {
  const id = (location.hash || "").replace(/^#/, "");
  return HASH_SECTIONS.has(id) ? id : null;
}

/** Keep first load at the hero/intro unless the URL hash asked for a section. */
function settleLoadScroll() {
  if (typeof window === "undefined") return;
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch {
    /* ignore */
  }
  const intro = document.documentElement.dataset.intro;
  const introBusy = intro === "invite" || intro === "opening" || intro === "reveal";
  const hash = intentionalHash();
  if (hash) {
    // Wait until the envelope is gone so hash scroll isn't hidden underneath.
    if (introBusy) {
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = prev;
      return;
    }
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView();
    return;
  }
  const prev = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  document.documentElement.style.scrollBehavior = prev;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest("#rsvp")) active.blur();
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
  settleLoadScroll();
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
      settleLoadScroll();
      return;
    }
    if (!root.dataset.intro || root.dataset.intro === "play") {
      root.dataset.intro = "invite";
    }
    root.dataset.motion = "armed";
    // Intro still up — stay pinned to the top under the envelope.
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Re-assert after hydration; browsers may restore scroll after paint.
    settleLoadScroll();
    let guard = true;
    const reassert = () => {
      if (!guard || intentionalHash()) return;
      // Never yank scroll once the guest has left the hero (footer must stay reachable).
      if (window.scrollY > window.innerHeight * 0.5) return;
      if (window.scrollY > 0) {
        const prev = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(0, 0);
        root.style.scrollBehavior = prev;
      }
    };
    const timers = [40, 200].map((ms) => window.setTimeout(reassert, ms));
    const release = window.setTimeout(() => {
      guard = false;
    }, 700);
    const onIntroDone = () => {
      if (root.dataset.intro === "done") settleLoadScroll();
    };
    const introWatch = new MutationObserver(onIntroDone);
    introWatch.observe(root, { attributes: true, attributeFilter: ["data-intro"] });

    if (root.dataset.motion === "off") {
      return () => {
        for (const id of timers) window.clearTimeout(id);
        window.clearTimeout(release);
        introWatch.disconnect();
      };
    }
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
    // Programmatic scrollIntoView / scroll-snap can skip a scroll event; re-check shortly after.
    const settleTimers = [120, 400, 900].map((ms) => window.setTimeout(markVisible, ms));
    return () => {
      for (const id of timers) window.clearTimeout(id);
      for (const id of settleTimers) window.clearTimeout(id);
      window.clearTimeout(release);
      introWatch.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", markVisible);
    };
  }, []);

  return null;
}
