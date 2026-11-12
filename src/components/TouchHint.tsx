"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Plain white instruction line near a touchable prop. Type and a soft dark
 * shadow only — no box, icon, or glow. Fades in once it is on screen.
 */
export function TouchHint({
  show,
  className = "",
  children,
}: {
  show: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !show) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.6,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  if (!show) return null;

  return (
    <p ref={ref} className={`touch-hint${inView ? " is-shown" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </p>
  );
}

/** "Tap" on touch screens, "Click" with a mouse — swapped in CSS so SSR matches. */
export function TapVerb() {
  return (
    <>
      <span className="touch-verb-touch">Tap</span>
      <span className="touch-verb-fine">Click</span>
    </>
  );
}
