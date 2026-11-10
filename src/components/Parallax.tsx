"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/** True on coarse pointers / small screens — dial back heavy depth. */
export function useLightParallax() {
  const reduce = useReducedMotion();
  const [light, setLight] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    const sync = () => setLight(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce || light;
}

export function usePageScrollProgress() {
  const { scrollYProgress } = useScroll();
  return useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.35 });
}

export function ParallaxLayer({
  children,
  speed = 0.15,
  className = "",
  style,
}: {
  children: ReactNode;
  /** Positive = moves slower than scroll (recedes). */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const light = useLightParallax();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (v) => (light ? 0 : v * speed * -0.12));

  return (
    <motion.div className={className} style={{ y, ...style }}>
      {children}
    </motion.div>
  );
}

export function useSectionParallax(ref: React.RefObject<HTMLElement | null>, range = 80) {
  const light = useLightParallax();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], light ? [0, 0] : [range, -range]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.55, 1, 1, 0.65]);
  return { y, opacity, scrollYProgress };
}

export function DepthTint({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.5, 1], [0.15, 0.05, 0.2]);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] bg-gradient-to-b from-fuchsia-950/20 via-transparent to-purple-950/30"
      style={{ opacity }}
    />
  );
}
