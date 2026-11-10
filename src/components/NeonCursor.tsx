"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/** Custom neon / cassette cursor — desktop fine pointer only. */
export function NeonCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 420, damping: 32, mass: 0.25 });
  const sy = useSpring(y, { stiffness: 420, damping: 32, mass: 0.25 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 900px)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    if (!mq.matches) return;

    document.documentElement.classList.add("neon-cursor-on");
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      setHovering(!!t?.closest("a,button,input,textarea,select,[role='button']"));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    return () => {
      document.documentElement.classList.remove("neon-cursor-on");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] mix-blend-screen"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
    >
      <svg
        width={hovering ? 44 : 34}
        height={hovering ? 44 : 34}
        viewBox="0 0 40 40"
        className="drop-shadow-[0_0_10px_#ff2bd6]"
      >
        {/* Mini cassette cursor */}
        <rect
          x="4"
          y="10"
          width="32"
          height="20"
          rx="3"
          fill="#1a1a22"
          stroke="#ff2bd6"
          strokeWidth="1.5"
        />
        <rect x="8" y="14" width="24" height="10" rx="1" fill="#ff2bd633" stroke="#2ef2c6" strokeWidth="0.8" />
        <circle cx="14" cy="19" r="3" fill="#c0c0c0" stroke="#666" strokeWidth="0.6" />
        <circle cx="26" cy="19" r="3" fill="#c0c0c0" stroke="#666" strokeWidth="0.6" />
        <circle
          cx="20"
          cy="20"
          r={hovering ? 18 : 14}
          fill="none"
          stroke="#39ff14"
          strokeWidth="1"
          opacity="0.55"
        />
      </svg>
    </motion.div>
  );
}
