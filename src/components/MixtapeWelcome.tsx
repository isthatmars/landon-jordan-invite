"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveFlag } from "@/lib/useLiveFlag";

const DAY_KEY = "lj-mix-welcome-day";

function localDayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seenToday() {
  try {
    return window.localStorage.getItem(DAY_KEY) === localDayStamp();
  } catch {
    return true;
  }
}

function markSeenToday() {
  try {
    window.localStorage.setItem(DAY_KEY, localDayStamp());
  } catch {
    /* ignore quota / private mode */
  }
}

function mixtapeViewportRatio() {
  const plate = document.getElementById("mixtape");
  if (!plate) return 0;
  const rect = plate.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
  return visible / vh;
}

/**
 * Once-per-day welcome when the mixtape plate fills the viewport.
 * Dismiss (OK / X / Escape / leave section) marks today so it does not return.
 */
export function MixtapeWelcome() {
  const live = useLiveFlag("liveMixtape", false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** Set only after dismiss / leave — survives Strict Mode remounts without eating the first open. */
  const doneForDay = useRef(false);
  const okRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const copyId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || open) return;
    if (seenToday()) {
      doneForDay.current = true;
      return;
    }

    const root = document.documentElement;
    let armTimer = 0;
    let io: IntersectionObserver | null = null;

    const clearArm = () => {
      if (armTimer) {
        window.clearTimeout(armTimer);
        armTimer = 0;
      }
    };

    const tryOpen = () => {
      if (doneForDay.current || seenToday()) return;
      if (document.hidden) return;
      const intro = root.dataset.intro;
      if (intro && intro !== "done") return;
      /* Sticky plates: once the mixtape owns most of the screen, invite them. */
      if (mixtapeViewportRatio() < 0.7) return;
      setOpen(true);
    };

    const schedule = () => {
      clearArm();
      armTimer = window.setTimeout(tryOpen, 280);
    };

    const plate = document.getElementById("mixtape");
    if (plate) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) schedule();
        },
        { threshold: [0.4, 0.55, 0.72, 0.85, 1] },
      );
      io.observe(plate);
    }

    const mo = new MutationObserver(schedule);
    mo.observe(root, {
      attributes: true,
      attributeFilter: ["data-live-mixtape", "data-intro"],
    });

    window.addEventListener("scroll", schedule, { passive: true });
    /* Sticky settle can land without another scroll/IO tick — poll while armed. */
    const poll = window.setInterval(schedule, 400);
    schedule();

    return () => {
      clearArm();
      window.clearInterval(poll);
      mo.disconnect();
      io?.disconnect();
      window.removeEventListener("scroll", schedule);
    };
  }, [mounted, live, open]);

  const dismiss = () => {
    markSeenToday();
    doneForDay.current = true;
    setOpen(false);
  };

  /* Leaving the boombox plate closes and counts as seen for the day. */
  useEffect(() => {
    if (!open) return;
    const plate = document.getElementById("mixtape");
    if (!plate) return;
    const io = new IntersectionObserver(
      () => {
        if (mixtapeViewportRatio() < 0.28) dismiss();
      },
      { threshold: [0, 0.2, 0.35, 0.5] },
    );
    io.observe(plate);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss while open only
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    const id = window.requestAnimationFrame(() => okRef.current?.focus());
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.cancelAnimationFrame(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="mix-welcome"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={copyId}
      data-testid="mixtape-welcome"
    >
      <button
        type="button"
        className="mix-welcome-scrim"
        aria-label="Close welcome"
        onClick={dismiss}
      />
      <div className="mix-welcome-panel">
        <button type="button" className="mix-welcome-close" aria-label="Close" onClick={dismiss}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              d="M6 6l12 12M18 6 6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <p id={titleId} className="mix-welcome-title">
          Welcome to the mixtape
        </p>
        <p id={copyId} className="mix-welcome-copy">
          We put care into this interactive, nostalgic experience for you. Feel free to click
          around — try the boombox buttons, pick a tape, and explore what responds.
        </p>
        <button ref={okRef} type="button" className="mix-welcome-ok" onClick={dismiss}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
