"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { RefObject } from "react";

/** Party color wash + grain behind lineup content; parallax tied to section scroll. */
export function LineupAmbient({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 32,
    mass: 0.4,
  });

  const yA = useTransform(progress, [0, 1], reduce ? ["0%", "0%"] : ["12%", "-18%"]);
  const xA = useTransform(progress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "10%"]);
  const yB = useTransform(progress, [0, 1], reduce ? ["0%", "0%"] : ["-10%", "16%"]);
  const xB = useTransform(progress, [0, 1], reduce ? ["0%", "0%"] : ["8%", "-12%"]);
  const yC = useTransform(progress, [0, 1], reduce ? ["0%", "0%"] : ["8%", "-14%"]);
  const scaleWash = useTransform(progress, [0, 0.5, 1], reduce ? [1, 1, 1] : [1.05, 1, 1.08]);

  return (
    <div className="lineup-ambient-stage" aria-hidden>
      <div className="lineup-ambient-base" />
      <motion.div className="lineup-ambient-parallax" style={{ y: yA, x: xA }}>
        <div className="lineup-ambient-blob lineup-ambient-blob-a" />
      </motion.div>
      <motion.div className="lineup-ambient-parallax" style={{ y: yB, x: xB }}>
        <div className="lineup-ambient-blob lineup-ambient-blob-b" />
      </motion.div>
      <motion.div className="lineup-ambient-parallax" style={{ y: yC }}>
        <div className="lineup-ambient-blob lineup-ambient-blob-c" />
      </motion.div>
      <motion.div className="lineup-ambient-wash" style={{ scale: scaleWash }} />
      <div className="lineup-ambient-grain" />
    </div>
  );
}
