"use client";

/**
 * Keeps the page where the guest left it while the TV player starts.
 * YouTube's iframe can pull focus and scroll the CRT into view. This puts
 * the window back immediately, without smooth scrolling.
 */
type Lock = {
  timer: number;
  restore: () => void;
  release: () => void;
};

type Bag = { lock: Lock | null };

const bagKey = "__landonJordanScrollLock";

function bag(): Bag {
  const host = window as Window & { [bagKey]?: Bag };
  if (!host[bagKey]) host[bagKey] = { lock: null };
  return host[bagKey];
}

export function holdScroll(ms = 1600) {
  if (typeof window === "undefined") return;
  const state = bag();
  const existing = state.lock;
  if (existing) {
    window.clearTimeout(existing.timer);
    existing.timer = window.setTimeout(existing.release, ms);
    existing.restore();
    return;
  }

  const x = window.scrollX;
  const y = window.scrollY;
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  let restoring = false;

  const restore = () => {
    if (restoring) return;
    if (window.scrollX === x && window.scrollY === y) return;
    restoring = true;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ left: x, top: y, behavior: "instant" });
    restoring = false;
  };

  const onScroll = () => restore();
  const release = () => {
    if (state.lock !== lock) return;
    window.removeEventListener("scroll", onScroll, true);
    document.removeEventListener("scroll", onScroll, true);
    restore();
    root.style.scrollBehavior = previousBehavior;
    state.lock = null;
  };

  const lock: Lock = { timer: 0, restore, release };
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  state.lock = lock;
  lock.timer = window.setTimeout(release, ms);
}
