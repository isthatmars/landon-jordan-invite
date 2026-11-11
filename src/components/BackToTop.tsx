"use client";

import { useEffect, useState } from "react";
import { onScrollFrame } from "@/lib/activePlate";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("home");
    let lastVisible = false;

    const update = () => {
      const threshold = hero ? hero.offsetHeight * 0.72 : window.innerHeight * 0.85;
      const next = window.scrollY > threshold;
      if (next === lastVisible) return;
      lastVisible = next;
      setVisible(next);
    };

    const onScroll = onScrollFrame(update);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <a
      href="#home"
      className={`back-to-top${visible ? " is-visible" : ""}`}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={(event) => {
        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) return;
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (typeof history !== "undefined") {
          history.replaceState(null, "", "#home");
        }
      }}
    >
      <span aria-hidden>↑</span>
      <span className="back-to-top-label">TOP</span>
    </a>
  );
}
