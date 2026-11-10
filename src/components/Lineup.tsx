"use client";

import type { SiteContent } from "@/lib/types";
import { LineIcon } from "./icons";

/** Sentence-case ALL-CAPS words for neon script legibility; leave stored/email copy alone. */
function dressCodeScript(text: string) {
  return text.replace(/[A-Z]{2,}/g, (word) => word[0] + word.slice(1).toLowerCase());
}

export function Lineup({ content }: { content: SiteContent }) {
  return (
    <section id="lineup" className="lineup-ambient relative overflow-hidden bg-[#07010f]">
      <div className="lineup-sweep" aria-hidden />
      <div className="lineup-wrap">
        <p className="lineup-kicker">{content.lineupTitle}</p>
        <p className="lineup-tagline">{content.lineupTagline}</p>

        <div className="lineup-grid">
          {content.lineup.map((block) => (
            <article key={block.id} className="lineup-card">
              <LineIcon name={block.icon} className="lineup-neon lineup-card-icon icon-shake" />
              <p className="lineup-time">{block.time}</p>
              <h3 className="lineup-card-title">{block.title}</h3>
              <p className="lineup-card-copy">{block.description}</p>
            </article>
          ))}
        </div>

        <div className="lineup-dress">
          <div className="lineup-dress-main">
            <LineIcon name="hanger" className="lineup-dress-icon icon-shake" />
            <p className="lineup-dress-label">Dress code</p>
            <p className="neon-script lineup-dress-script">{dressCodeScript(content.dressCode)}</p>
          </div>
          <p className="lineup-dress-prize">
            <LineIcon name="trophy" className="lineup-dress-icon icon-shake" />
            <span>{content.dressCodePrize}</span>
          </p>
        </div>

        <div className="lineup-private">
          <p className="lineup-private-title">
            <LineIcon name="lock" className="lineup-lock icon-shake" />
            {content.privateNote}
          </p>
          <p className="lineup-private-copy">
            This celebration stays exclusive. Register every adult and child by name, and do not
            bring anyone who isn&apos;t on the list.
          </p>
        </div>
      </div>
    </section>
  );
}
