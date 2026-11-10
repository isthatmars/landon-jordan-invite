"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("home");

    const update = () => {
      const threshold = hero ? hero.offsetHeight * 0.72 : window.innerHeight * 0.85;
      setVisible(window.scrollY > threshold);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
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
