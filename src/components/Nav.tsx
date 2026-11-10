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
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-3 py-3 sm:px-5">
        <a href="#home" className="flex shrink-0 items-center gap-1.5">
          <Crown className="h-4 w-5 drop-shadow-[0_0_6px_#ffd45a]" />
          <span className="neon-script text-[1.55rem] leading-none sm:text-[1.8rem]">
            {brandName}
          </span>
        </a>

        <nav className="font-nav ml-auto hidden min-w-0 items-center gap-2.5 whitespace-nowrap text-[11px] min-[680px]:flex sm:gap-3.5 sm:text-[13px]">
          {links.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              className={`shrink-0 ${
                i === 0
                  ? "text-[#ff4fd8] underline decoration-2 underline-offset-[7px]"
                  : "text-white hover:text-[#ff4fd8]"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="#rsvp"
          className="btn-pink-outline ml-auto shrink-0 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] min-[680px]:ml-1 sm:px-4 sm:text-[11px]"
        >
          RSVP
        </a>
        <button
          type="button"
          className="text-[10px] font-bold tracking-[0.16em] text-white min-[680px]:hidden"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "CLOSE" : "MENU"}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-2 bg-[#07010fcc] px-4 py-3 text-xs tracking-[0.18em] min-[680px]:hidden">
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
