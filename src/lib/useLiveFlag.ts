"use client";

import { useEffect, useState } from "react";

type LiveKey =
  | "liveHome"
  | "liveMixtape"
  | "liveWatch"
  | "liveArcade"
  | "livePhotobooth"
  | "liveLineup"
  | "liveRsvp";

type WarmKey =
  | "warmHome"
  | "warmMixtape"
  | "warmWatch"
  | "warmArcade"
  | "warmPhotobooth"
  | "warmLineup"
  | "warmRsvp";

/** True when the cinematic plate is the covering scene (and the tab is visible). */
export function useLiveFlag(key: LiveKey, fallback = true) {
  return useHtmlDataFlag(key, fallback);
}

/**
 * True while a plate should stay motion-hot: covering, a neighbor of covering,
 * or still intersecting the viewport. Far plates drop to false so CSS/JS can pause.
 */
export function useWarmFlag(key: WarmKey, fallback = true) {
  return useHtmlDataFlag(key, fallback);
}

function useHtmlDataFlag(key: LiveKey | WarmKey, fallback: boolean) {
  const [live, setLive] = useState(fallback);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const next = document.hidden ? false : root.dataset[key] !== "0";
      // Skip no-op updates so MutationObserver chatter doesn't re-render.
      setLive((prev) => (prev === next ? prev : next));
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: [`data-${camelToKebab(key)}`] });
    document.addEventListener("visibilitychange", sync);
    return () => {
      mo.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [key]);

  return live;
}

function camelToKebab(key: string) {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
