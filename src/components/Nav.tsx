"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const links = [
  { href: "#home", label: "HOME" },
  { href: "#mixtape", label: "THE MIXTAPE" },
  { href: "#watch", label: "WATCH" },
  { href: "#lineup", label: "THE LINEUP" },
];

export function Nav({ brandName }: { brandName: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled ? "bg-[#05010fcc] backdrop-blur-md border-b border-pink-500/20" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <a href="#home" className="flex items-center gap-2 shrink-0">
          <span className="text-neon-gold text-lg drop-shadow-[0_0_8px_#ffd700]" aria-hidden>
            ♛
          </span>
          <span className="font-[family-name:var(--font-script)] text-xl md:text-2xl text-white">
            {brandName}
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-xs tracking-[0.18em] font-semibold">
          {links.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              className={`hover:text-neon-pink transition-colors ${
                i === 0 ? "text-neon-pink underline underline-offset-8 decoration-2" : "text-white"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href="#rsvp" className="btn-pink-outline text-xs tracking-[0.16em] font-bold">
            RSVP
          </a>
          <button
            type="button"
            className="md:hidden btn-pink-outline px-3 py-2 text-xs"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-pink-500/20 bg-[#05010fee] px-4 py-3 space-y-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block py-2 text-sm tracking-widest"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </motion.header>
  );
}
