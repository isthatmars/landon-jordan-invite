"use client";

import type { ReactNode } from "react";
import type { SiteContent } from "@/lib/types";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { CalendarIcon, ClockIcon, Crown, GreenSwoosh, PinIcon, PinkSwoosh } from "./icons";

export function Hero({ content }: { content: SiteContent }) {
  const dateParts = content.eventDate.trim().split(/\s+/);
  const dateKicker = dateParts[0] ?? "";
  const dateRestRaw = dateParts.slice(1).join(" ");
  const dateRest = /2026/.test(dateRestRaw) ? dateRestRaw : dateRestRaw.replace(/19(?:TH|th)?/, "19, 2026");
  const chromeIsArt = content.heroChrome.trim().toLowerCase() === "80s";

  return (
    <section id="home" className="hero-scene">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/hero-bg-miami.jpg" alt="" className="hero-bg" />
      <HeroAtmosphere />
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
            <h1 className="script-hot hero-script">{content.heroScript}</h1>
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
            <p className="script-hot hero-invite">{content.heroInvite}</p>
            <PinkSwoosh className="hero-swoosh" />
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
            <span className="fact-address">{content.eventAddress}</span>
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

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="hero-fact">
      {icon}
      <div>{children}</div>
    </div>
  );
}
