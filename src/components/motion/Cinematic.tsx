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

const PLATE_IDS = ["home", "mixtape", "watch", "arcade", "lineup", "rsvp"] as const;

const HASH_SECTIONS = new Set(["home", "mixtape", "watch", "arcade", "lineup", "rsvp"]);

/**
 * Active plate from document-flow positions (not sticky visual rects).
 * Stuck sticky plates all report top≈0 via getBoundingClientRect; summing
 * offsetHeight + marginTop keeps live flags on the plate currently covering.
 */
function activePlateId(): (typeof PLATE_IDS)[number] {
  const probe = window.scrollY + Math.min(160, window.innerHeight * 0.3);
  let cursor = 0;
  let active: (typeof PLATE_IDS)[number] = "home";
  for (const id of PLATE_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const mt = parseFloat(getComputedStyle(el).marginTop) || 0;
    const start = cursor + mt;
    if (probe >= start + 4) active = id;
    cursor = start + el.offsetHeight;
  }
  return active;
}

function syncLiveFlags(root: HTMLElement) {
  const active = activePlateId();
  root.dataset.liveHome = active === "home" ? "1" : "0";
  for (const [id, seenKey, liveKey] of SECTIONS) {
    const isActive = active === id;
    if (isActive) root.dataset[seenKey] = "1";
    root.dataset[liveKey] = isActive ? "1" : "0";
  }
}

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

    // IntersectionObserver still marks entrance "seen" flags for cinematic reveals.
    // Live flags use scroll-flow positions so sticky-under plates don't stay live.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          if (id === "home") continue;
          const spec = SECTIONS.find((row) => row[0] === id);
          if (!spec) continue;
          root.dataset[spec[1]] = "1";
        }
        syncLiveFlags(root);
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );

    const home = document.getElementById("home");
    if (home) io.observe(home);
    for (const [id] of SECTIONS) {
      const node = document.getElementById(id);
      if (node) io.observe(node);
    }
    const markVisible = () => syncLiveFlags(root);
    markVisible();
    window.addEventListener("scroll", markVisible, { passive: true });
    window.addEventListener("resize", markVisible);
    // Programmatic scrollIntoView can skip a scroll event; re-check shortly after.
    const settleTimers = [120, 400, 900].map((ms) => window.setTimeout(markVisible, ms));
    return () => {
      for (const id of timers) window.clearTimeout(id);
      for (const id of settleTimers) window.clearTimeout(id);
      window.clearTimeout(release);
      introWatch.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", markVisible);
      window.removeEventListener("resize", markVisible);
    };
  }, []);

  return null;
}
