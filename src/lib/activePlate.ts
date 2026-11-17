/** Sticky scene plates — keep in sync with cinematic section order. */
export const PLATE_IDS = [
  "home",
  "mixtape",
  "watch",
  "arcade",
  "lineup",
  "photobooth",
  "rsvp",
] as const;
export type PlateId = (typeof PLATE_IDS)[number];

type MarginCache = { widths: number; margins: number[] };

let marginCache: MarginCache | null = null;

function plateMargins(): number[] {
  const widths = window.innerWidth;
  if (marginCache && marginCache.widths === widths) return marginCache.margins;
  const margins = PLATE_IDS.map((id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(getComputedStyle(el).marginTop) || 0;
  });
  marginCache = { widths, margins };
  return margins;
}

/** Drop cached margins after layout-affecting changes (resize, orientation). */
export function invalidatePlateMargins() {
  marginCache = null;
}

/**
 * Active plate from document-flow positions (not sticky visual rects).
 * Stuck sticky plates all report top≈0 via getBoundingClientRect; summing
 * offsetHeight + marginTop keeps live/nav flags on the plate currently covering.
 */
export function activePlateId(probeRatio = 0.72): PlateId {
  const probe = window.scrollY + window.innerHeight * probeRatio;
  const margins = plateMargins();
  let cursor = 0;
  let active: PlateId = "home";
  for (let i = 0; i < PLATE_IDS.length; i++) {
    const id = PLATE_IDS[i];
    const el = document.getElementById(id);
    if (!el) continue;
    const start = cursor + margins[i];
    if (probe >= start + 4) active = id;
    cursor = start + el.offsetHeight;
  }
  return active;
}

/** Coalesce scroll/resize work to one paint frame. */
export function onScrollFrame(handler: () => void) {
  let ticking = false;
  const run = () => {
    ticking = false;
    handler();
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(run);
  };
  return onScroll;
}
