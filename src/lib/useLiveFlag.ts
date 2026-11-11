"use client";

import { useEffect, useState } from "react";

type LiveKey =
  | "liveHome"
  | "liveMixtape"
  | "liveWatch"
  | "liveArcade"
  | "liveLineup"
  | "liveRsvp";

/** True when the cinematic plate is the covering scene (and the tab is visible). */
export function useLiveFlag(key: LiveKey, fallback = true) {
  const [live, setLive] = useState(fallback);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (document.hidden) {
        setLive(false);
        return;
      }
      const value = root.dataset[key];
      // Unset means cinematic hasn't stamped flags yet — treat as live.
      setLive(value !== "0");
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
