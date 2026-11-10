"use client";

import type { ReactNode } from "react";
import type { SiteContent } from "@/lib/types";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { Handwrite } from "./motion/Handwrite";
import { IntroVeil } from "./motion/IntroVeil";
import { CalendarIcon, ClockIcon, Crown, GreenSwoosh, PinIcon } from "./icons";

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
              src="/images/hero-couple-cutout.png"
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

        <a href="#rsvp" className="btn-rsvp-now">
          RSVP NOW <span className="rsvp-arrow" aria-hidden>→</span>
        </a>
      </div>
    </section>
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
