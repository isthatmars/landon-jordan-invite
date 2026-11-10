"use client";

import { useState } from "react";
import { Crown } from "./icons";

const links = [
  { href: "#home", label: "HOME" },
  { href: "#mixtape", label: "THE MIXTAPE" },
  { href: "#watch", label: "WATCH" },
  { href: "#lineup", label: "THE LINEUP" },
];

export function Nav({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="#home" className="brand-lockup">
          <Crown className="brand-crown" />
          <span className="script-hot brand-script">{brandName}</span>
        </a>

        <nav className="site-nav font-nav" aria-label="Primary">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={l.href === "#home" ? "is-home" : undefined}>
              {l.label}
            </a>
          ))}
        </nav>

        <a href="#rsvp" className="btn-header-rsvp">
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
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
