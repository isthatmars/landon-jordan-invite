"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { scrollToSection } from "@/lib/scrollToSection";
import { Crown } from "./icons";

const links = [
  { href: "#home", label: "HOME" },
  { href: "#mixtape", label: "THE MIXTAPE" },
  { href: "#watch", label: "WATCH" },
  { href: "#lineup", label: "THE LINEUP" },
];

const SECTION_IDS = ["home", "mixtape", "watch", "arcade", "lineup", "rsvp"] as const;
const SCROLL_BG_THRESHOLD = 16;

function goHash(href: string, event?: MouseEvent<HTMLAnchorElement>) {
  const id = href.replace(/^#/, "");
  if (!SECTION_IDS.includes(id as (typeof SECTION_IDS)[number])) return;
  event?.preventDefault();
  if (location.hash !== `#${id}`) {
    history.pushState(null, "", `#${id}`);
  }
  scrollToSection(id);
}

export function Nav({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("#home");

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > SCROLL_BG_THRESHOLD);

      // Section owns the active state once its top crosses the upper third.
      const marker = Math.min(280, window.innerHeight * 0.36);
      let current = "#home";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= marker) current = `#${id}`;
      }
      // Arcade has no nav link — keep Watch active while in arcade.
      if (current === "#arcade") current = "#watch";
      setActive(current);
    };

    const onHash = () => {
      const id = (location.hash || "").replace(/^#/, "");
      if (SECTION_IDS.includes(id as (typeof SECTION_IDS)[number])) {
        scrollToSection(id);
      }
      update();
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="site-header-inner">
        <a href="#home" className="brand-lockup" onClick={(e) => goHash("#home", e)}>
          <Crown className="brand-crown" />
          <span className="script-hot brand-script">{brandName}</span>
        </a>

        <nav className="site-nav font-nav" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={active === l.href ? "is-active" : undefined}
              aria-current={active === l.href ? "true" : undefined}
              onClick={(e) => goHash(l.href, e)}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="#rsvp"
          className={`btn-header-rsvp${active === "#rsvp" ? " is-active" : ""}`}
          onClick={(e) => goHash("#rsvp", e)}
        >
          RSVP
        </a>
        <button
          type="button"
          className="site-menu font-nav"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "CLOSE" : "MENU"}
        </button>
      </div>
      {open && (
        <nav className="site-nav-mobile font-nav" aria-label="Mobile">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={active === l.href ? "is-active" : undefined}
              onClick={(e) => {
                setOpen(false);
                goHash(l.href, e);
              }}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#rsvp"
            onClick={(e) => {
              setOpen(false);
              goHash("#rsvp", e);
            }}
          >
            RSVP
          </a>
        </nav>
      )}
    </header>
  );
}
