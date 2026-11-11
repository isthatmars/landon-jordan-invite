"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { RefObject } from "react";
import { useLiveFlag } from "@/lib/useLiveFlag";

/** Party color wash + grain behind lineup content; parallax tied to section scroll. */
export function LineupAmbient({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const reduceMotion = useReducedMotion();
  const lineupLive = useLiveFlag("liveLineup");
  // Gate style application — never rebuild transform ranges when live toggles
  // (that snapped blobs between 0% and parallax and looked like a flash).
  const parallaxOn = Boolean(!reduceMotion && lineupLive);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 32,
    mass: 0.4,
  });

  const yA = useTransform(progress, [0, 1], ["12%", "-18%"]);
  const xA = useTransform(progress, [0, 1], ["-6%", "10%"]);
  const yB = useTransform(progress, [0, 1], ["-10%", "16%"]);
  const xB = useTransform(progress, [0, 1], ["8%", "-12%"]);
  const yC = useTransform(progress, [0, 1], ["8%", "-14%"]);
  const scaleWash = useTransform(progress, [0, 0.5, 1], [1.05, 1, 1.08]);

  return (
    <div className="lineup-ambient-stage" aria-hidden>
      <div className="lineup-ambient-base" />
      <motion.div
        className="lineup-ambient-parallax"
        style={parallaxOn ? { y: yA, x: xA } : undefined}
      >
        <div className="lineup-ambient-blob lineup-ambient-blob-a" />
      </motion.div>
      <motion.div
        className="lineup-ambient-parallax"
        style={parallaxOn ? { y: yB, x: xB } : undefined}
      >
        <div className="lineup-ambient-blob lineup-ambient-blob-b" />
      </motion.div>
      <motion.div
        className="lineup-ambient-parallax"
        style={parallaxOn ? { y: yC } : undefined}
      >
        <div className="lineup-ambient-blob lineup-ambient-blob-c" />
      </motion.div>
      <motion.div
        className="lineup-ambient-wash"
        style={parallaxOn ? { scale: scaleWash } : undefined}
      />
      <div className="lineup-ambient-grain" />
    </div>
  );
}
