"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { onScrollFrame } from "@/lib/activePlate";
import { scrollToSection } from "@/lib/scrollToSection";
import type { SiteContent } from "@/lib/types";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { Handwrite } from "./motion/Handwrite";
import { IntroVeil } from "./motion/IntroVeil";
import { CalendarIcon, ClockIcon, Crown, GreenSwoosh, PinIcon } from "./icons";

declare global {
  interface Window {
    __ljIntroStart?: number;
  }
}

function goRsvp(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  if (location.hash !== "#rsvp") {
    history.pushState(null, "", "#rsvp");
  }
  scrollToSection("rsvp");
}

function goMixtape(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  if (location.hash !== "#mixtape") {
    history.pushState(null, "", "#mixtape");
  }
  scrollToSection("mixtape");
}

export function Hero({ content }: { content: SiteContent }) {
  const dateParts = content.eventDate.trim().split(/\s+/);
  const dateKicker = (dateParts[0] ?? "").replace(/,$/, "");
  const dateRestRaw = dateParts.slice(1).join(" ").replace(/,$/, "");
  const dateRest = (/2026/.test(dateRestRaw) ? dateRestRaw : dateRestRaw.replace(/19(?:TH|th)?/, "19, 2026")).replace(
    /\bDEC\b/i,
    "DECEMBER",
  );
  const addressLines = formatAddress(content.eventAddress);
  const chromeIsArt = content.heroChrome.trim().toLowerCase() === "80s";

  return (
    <section id="home" className="hero-scene">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/hero-bg-miami.jpg" alt="" className="hero-bg" />
      <HeroAtmosphere />
      <IntroVeil />
      <div className="hero-shade" />
      <div className="hero-ambient" aria-hidden />

      <div className="hero-frame">
        <div className="hero-stage">
          <div className="hero-people">
            <div className="floor-contact" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-couple-cutout-cartoon.png"
              alt="Landon and Jordan in 80s windbreakers"
              className="hero-couple"
              draggable={false}
            />
          </div>

          <div className="hero-copy">
            <div className="hero-type-glow" aria-hidden />
            <Crown className="hero-crown" />
            <Handwrite as="h1" className="hero-script" inkClassName="script-hot" delay={780} duration={620}>
              {content.heroScript}
            </Handwrite>
            {chromeIsArt ? (
              <span className="chrome-art-shine">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/chrome-80s.png"
                  alt={content.heroChrome}
                  className="chrome-80s-art"
                  draggable={false}
                />
              </span>
            ) : (
              <p className="chrome-80s chrome-shine hero-chrome-fallback" data-text={content.heroChrome}>
                {content.heroChrome}
              </p>
            )}
            <p className="hero-birthday">{content.heroSubtitle}</p>
            <GreenSwoosh className="hero-swoosh-lime" stroke="#C6FF00" />
          </div>
        </div>

        <div className="hero-facts">
          <div className="hero-facts-main">
            <Fact icon={<CalendarIcon className="fact-icon" />}>
              <span className="fact-label">{dateKicker}</span>
              <span className="fact-value">{dateRest}</span>
            </Fact>
            <span className="fact-rule" aria-hidden />
            <Fact icon={<PinIcon className="fact-icon" />}>
              <span className="fact-value">{content.eventVenue}</span>
              {addressLines.map((line) => (
                <span className="fact-address" key={line}>
                  {line}
                </span>
              ))}
            </Fact>
            <span className="fact-rule" aria-hidden />
            <Fact icon={<ClockIcon className="fact-icon" />}>
              <span className="fact-value">{content.eventTime}</span>
            </Fact>
          </div>
          <div className="hero-facts-divider" aria-hidden />
          <a href="#rsvp" className="hero-facts-rsvp" onClick={goRsvp}>
            <span className="hero-facts-rsvp-label">
              RSVP <span className="rsvp-arrow" aria-hidden>→</span>
            </span>
          </a>
        </div>
      </div>

      <HeroScrollCue />
    </section>
  );
}

/** After last hero reveal beats (~2.08s + duration) — cue enters so attention lands here. */
const SCROLL_CUE_AFTER_REVEAL_MS = 2450;
/** Returning visit / intro already done — short beat so brand paints first. */
const SCROLL_CUE_AFTER_DONE_MS = 900;

/** Far-right scroll cue on #home — fades once past the hero (inverted BackToTop). */
function HeroScrollCue() {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("home");
    let lastVisible = true;

    const update = () => {
      const threshold = hero ? hero.offsetHeight * 0.72 : window.innerHeight * 0.85;
      const next = window.scrollY <= threshold;
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

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer: number | undefined;

    const arm = (delayMs: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setReady(true), reduce ? 0 : delayMs);
    };

    const schedule = () => {
      const intro = root.dataset.intro;
      if (reduce) {
        arm(0);
        return;
      }
      if (intro === "reveal") {
        const start = window.__ljIntroStart ?? Date.now();
        arm(Math.max(0, SCROLL_CUE_AFTER_REVEAL_MS - (Date.now() - start)));
        return;
      }
      if (intro === "done") {
        // Full intro: keep the post-reveal beat even after data-intro flips to done.
        // Returning visits (no __ljIntroStart): short delay so brand paints first.
        const start = window.__ljIntroStart;
        if (start) {
          arm(Math.max(0, SCROLL_CUE_AFTER_REVEAL_MS - (Date.now() - start)));
        } else {
          arm(SCROLL_CUE_AFTER_DONE_MS);
        }
      }
      // invite / opening — wait for reveal or done
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { attributes: true, attributeFilter: ["data-intro"] });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const show = visible && ready;

  return (
    <a
      href="#mixtape"
      className={`hero-scroll-cue${show ? " is-visible" : ""}`}
      aria-label="Scroll down to the mixtape"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      onClick={goMixtape}
    >
      <svg className="hero-scroll-cue-icon" viewBox="0 0 32 32" aria-hidden>
        <path
          d="M8 12.5 16 20.5 24 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hero-scroll-cue-label">Scroll</span>
    </a>
  );
}

function formatAddress(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const title = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      .replace(/\bFl\b/g, "FL")
      .replace(/\bRd\b/g, "Rd");
  if (parts.length >= 2) return [title(parts[0]), title(parts.slice(1).join(", "))];
  return [title(address)];
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="hero-fact">
      {icon}
      <div>{children}</div>
    </div>
  );
}
