/** Gold crown — glow is a CSS radial halo on the wrapper, never `filter` (Blink boxes drop-shadow). */
export function Crown({ className = "" }: { className?: string }) {
  return (
    <span className={`crown-mark ${className}`.trim()} aria-hidden>
      <svg viewBox="0 0 72 48" className="crown-mark-svg" focusable="false">
        <path
          fill="#ffd45a"
          d="M8 38 14 16l16 12L36 6l6 22 16-12 6 22H8z"
        />
        <path fill="#ffe9a0" d="M10 36h52v6H10z" />
        <circle cx="36" cy="10" r="2.2" fill="#fff4c4" />
      </svg>
    </span>
  );
}

export function GreenSwoosh({
  className = "",
  stroke = "#7CFF3A",
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg viewBox="0 0 220 18" className={className} fill="none" aria-hidden>
      <path d="M6 12C50 2 120 2 214 8" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PinkSwoosh({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 48" className={className} fill="none" aria-hidden>
      <path
        d="M8 30c34 12 62 16 98 8 24-5 20-16 44-18 30-2 46 16 78 14 34-2 52-14 84-20"
        stroke="#ff39c8"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M16 28c28 8 52 10 82 4 18-4 16-12 36-13 26-1 40 12 68 10"
        stroke="#fff6fc"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function NeonArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 92 56" className={className} fill="none" aria-hidden>
      <path
        d="M6 12c24 4 46 14 68 32"
        stroke="#ff4fd8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M56 32 78 46 62 48"
        stroke="#ff4fd8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <rect x="5" y="7" width="22" height="20" rx="4" stroke="#ff39c8" strokeWidth="2" />
      <path d="M5 13h22M11 5v5M21 5v5" stroke="#ff39c8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <path
        d="M16 28s8-8.2 8-14a8 8 0 1 0-16 0c0 5.8 8 14 8 14z"
        stroke="#ff39c8"
        strokeWidth="2"
      />
      <circle cx="16" cy="14" r="2.4" fill="#ff39c8" />
    </svg>
  );
}

export function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <circle cx="16" cy="16" r="10" stroke="#ff39c8" strokeWidth="2" />
      <path d="M16 10v7l4 2" stroke="#ff39c8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GamepadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <rect x="3" y="10" width="26" height="14" rx="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 17h6M12 14v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="21" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="24" cy="18.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Classic Pac-Man wedge — used on the arcade START GAME CTA. */
export function PacManIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="12" fill="currentColor" />
      <path d="M16 16 28 8A12 12 0 0 0 28 24Z" fill="#060912" />
      <circle cx="13.2" cy="10.8" r="1.7" fill="#060912" />
    </svg>
  );
}

type GlyphName = "skate" | "dinner" | "dj" | "hanger" | "trophy" | "lock";

export function LineIcon({ name, className = "" }: { name: GlyphName; className?: string }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  if (name === "skate") {
    return (
      <svg {...common}>
        <path d="M14 20c1-8 6-12 12-12h8c3 0 5 2 5 5v2c0 2-2 4-5 4H16" />
        <path d="M16 14c.6 2.4.6 5 0 7M21 13c.6 2.6.6 5 0 8M26 14c.6 2.2.6 4.4 0 6.4" />
        <path d="M8 24h32" />
        <circle cx="14" cy="32" r="3.2" />
        <circle cx="23" cy="32" r="3.2" />
        <circle cx="32" cy="32" r="3.2" />
        <circle cx="39" cy="30" r="2.3" />
      </svg>
    );
  }
  if (name === "dinner") {
    return (
      <svg {...common}>
        <path d="M16 6v16c0 3-2 5-4 5" />
        <path d="M16 14H12M16 18H12" />
        <path d="M16 28v14" />
        <path d="M30 6v36" />
        <path d="M30 18c5 0 7-3 7-8V6" />
      </svg>
    );
  }
  if (name === "dj") {
    return (
      <svg {...common}>
        <path d="M8 26a16 16 0 0 1 32 0" />
        <rect x="6" y="24" width="8" height="14" rx="4" />
        <rect x="34" y="24" width="8" height="14" rx="4" />
        <path d="M10 31H8M38 31h2" />
      </svg>
    );
  }
  if (name === "hanger") {
    return (
      <svg {...common}>
        <path d="M24 8a4 4 0 1 1 0 8c-2.2 0-3.2 1.4-3.2 3.2" />
        <path d="M6 36 20 22l4 4 4-4 14 14" />
        <path d="M6 36h36" />
      </svg>
    );
  }
  if (name === "trophy") {
    return (
      <svg {...common}>
        <path d="M16 8h16v10a8 8 0 0 1-16 0V8z" />
        <path d="M16 12H9c0 7 5 9 7 9M32 12h7c0 7-5 9-7 9" />
        <path d="M24 26v6M16 40h16M18 34h12l-1 6H19z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="12" y="20" width="24" height="18" rx="3" />
      <path d="M18 20v-5a6 6 0 0 1 12 0v5" />
      <circle cx="24" cy="29" r="1.6" fill="currentColor" />
    </svg>
  );
}
