"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Quiet editorial line under an interactive prop. Fades in only once the
 * caption itself has settled into view, so it reads after the scene lands.
 */
export function PropCaption({
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
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "0px 0px -10% 0px",
      threshold: 1,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const visible = show && inView;

  return (
    <p
      ref={ref}
      className={`prop-caption${visible ? " is-shown" : ""}${className ? ` ${className}` : ""}`}
      aria-hidden={!visible}
    >
      {children}
    </p>
  );
}

/** "Tap" on touch screens, "Click" with a mouse — swapped purely in CSS. */
export function TapVerb() {
  return (
    <>
      <span className="prop-verb-touch">Tap</span>
      <span className="prop-verb-fine">Click</span>
    </>
  );
}
