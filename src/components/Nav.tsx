"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  activePlateId,
  invalidatePlateMargins,
  onScrollFrame,
  PLATE_IDS,
  type PlateId,
} from "@/lib/activePlate";
import { scrollToSection } from "@/lib/scrollToSection";
import { Crown } from "./icons";

const links = [
  { href: "#home", label: "HOME" },
  { href: "#mixtape", label: "THE MIXTAPE" },
  { href: "#watch", label: "WATCH" },
  { href: "#lineup", label: "THE LINEUP" },
  { href: "#photobooth", label: "PHOTO BOOTH" },
];

const SECTION_IDS = PLATE_IDS;
const SCROLL_BG_THRESHOLD = 16;

function navHashForPlate(id: PlateId): string {
  // Arcade has no nav link — keep Watch active while in arcade.
  if (id === "arcade") return "#watch";
  return `#${id}`;
}

export function Nav({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("#home");

  const goHash = (href: string, event?: MouseEvent<HTMLAnchorElement>) => {
    const id = href.replace(/^#/, "");
    if (!SECTION_IDS.includes(id as PlateId)) return;
    event?.preventDefault();
    // Optimistic active state so sticky smooth-scroll lag cannot flash the wrong tab.
    setActive(navHashForPlate(id as PlateId));
    // Mark cinematic "seen" immediately so entrance gates never blank the target.
    const root = document.documentElement;
    if (id === "mixtape") root.dataset.seenMixtape = "1";
    if (id === "watch" || id === "arcade") {
      root.dataset.seenWatch = "1";
      if (id === "arcade") root.dataset.seenArcade = "1";
    }
    if (id === "photobooth") root.dataset.seenPhotobooth = "1";
    if (id === "lineup") root.dataset.seenLineup = "1";
    if (id === "rsvp") root.dataset.seenRsvp = "1";
    if (location.hash !== `#${id}`) {
      history.pushState(null, "", `#${id}`);
    }
    scrollToSection(id);
  };

  useEffect(() => {
    let lastScrolled = false;
    let lastActive = "#home";

    const update = () => {
      const nextScrolled = window.scrollY > SCROLL_BG_THRESHOLD;
      if (nextScrolled !== lastScrolled) {
        lastScrolled = nextScrolled;
        setScrolled(nextScrolled);
      }

      // Flow-based plate id — getBoundingClientRect lies once sticky plates stick.
      const nextActive = navHashForPlate(activePlateId(0.36));
      if (nextActive !== lastActive) {
        lastActive = nextActive;
        setActive(nextActive);
      }
    };

    const onScroll = onScrollFrame(update);
    const onResize = onScrollFrame(() => {
      invalidatePlateMargins();
      update();
    });

    const onHash = () => {
      const id = (location.hash || "").replace(/^#/, "");
      if (SECTION_IDS.includes(id as PlateId)) {
        scrollToSection(id);
      }
      update();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
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
