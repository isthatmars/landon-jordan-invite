"use client";

import { useEffect, useLayoutEffect } from "react";
import {
  activePlateId,
  invalidatePlateMargins,
  onScrollFrame,
} from "@/lib/activePlate";
import { scrollToSection } from "@/lib/scrollToSection";
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

function syncLiveFlags(root: HTMLElement) {
  // Probe lower viewport so a covering sticky plate claims "live" before
  // the previous plate's bottom CTAs (hero RSVP) can ghost over it.
  const active = activePlateId(0.72);
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
    scrollToSection(hash, { behavior: "auto" });
    // Deep-link: mark the target seen so cinematic opacity gates never blank it.
    const root = document.documentElement;
    if (hash === "mixtape") root.dataset.seenMixtape = "1";
    if (hash === "watch") root.dataset.seenWatch = "1";
    if (hash === "arcade") {
      root.dataset.seenWatch = "1";
      root.dataset.seenArcade = "1";
    }
    if (hash === "lineup") root.dataset.seenLineup = "1";
    if (hash === "rsvp") root.dataset.seenRsvp = "1";
    return;
  }
  const prev = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";
  // Reset both axes — sideways overflow can paint the wrong plate on mobile.
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
    // Pause CSS loops while the tab is backgrounded (audio keeps playing).
    const syncPageHidden = () => {
      root.dataset.pageHidden = document.hidden ? "1" : "0";
    };
    syncPageHidden();
    document.addEventListener("visibilitychange", syncPageHidden);

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
        document.removeEventListener("visibilitychange", syncPageHidden);
      };
    }
    root.dataset.motion = "armed";

    // IntersectionObserver still marks entrance "seen" flags for cinematic reveals.
    // Live flags use scroll-flow positions so sticky-under plates don't stay live.
    // Do NOT auto scrollIntoView on RSVP intersect — that reintroduces the footer bounce trap.
    // Nav/hash use block:center; #rsvp flex mid-plate covers natural scroll-in.
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
    const onScroll = onScrollFrame(markVisible);
    const onResize = onScrollFrame(() => {
      invalidatePlateMargins();
      markVisible();
    });
    markVisible();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Programmatic scrollIntoView can skip a scroll event; re-check shortly after.
    const settleTimers = [120, 400, 900].map((ms) => window.setTimeout(markVisible, ms));
    return () => {
      for (const id of timers) window.clearTimeout(id);
      for (const id of settleTimers) window.clearTimeout(id);
      window.clearTimeout(release);
      introWatch.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", syncPageHidden);
    };
  }, []);

  return null;
}
