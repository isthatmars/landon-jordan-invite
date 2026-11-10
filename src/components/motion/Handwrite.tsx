"use client";

import { useEffect, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Directional stroke reveal for a webfont script line.
 * The glyphs stay in the DOM; a mask follows the writing direction and a pen
 * tip leads the edge. Plays from the intro clock (CSS), not on every scroll.
 */
export function Handwrite({
  as,
  className = "",
  inkClassName = "",
  children,
  delay = 0,
  duration = 900,
}: {
  as?: ElementType;
  className?: string;
  /** Gradient/fill classes. Kept off the masked node’s filter so the glow can spill. */
  inkClassName?: string;
  children: ReactNode;
  delay?: number;
  duration?: number;
}) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const Tag = as ?? "span";
  const style = {
    "--hw-delay": `${delay}ms`,
    "--hw-dur": `${duration}ms`,
  } as CSSProperties;

  return (
    <div className="hw-slot">
      <Tag className={className} data-neon={reduce ? "on" : "breathing"}>
        <span className={`hw ${inkClassName}`.trim()} style={style}>
          {children}
        </span>
      </Tag>
      {reduce ? null : <span className="hw-tip" style={style} aria-hidden />}
    </div>
  );
}
