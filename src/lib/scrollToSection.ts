/** Smoothly bring a section into view.
 *  Sticky plates make scrollIntoView(#home) a no-op once #home is stuck at top:0 —
 *  always pin home with scrollTo(0). Other plates still use scrollIntoView. */
export function scrollToSection(
  id: string,
  opts?: { behavior?: ScrollBehavior },
): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = opts?.behavior ?? (reduce ? "auto" : "smooth");

  if (id === "home") {
    window.scrollTo({ top: 0, behavior });
    return true;
  }

  const block: ScrollLogicalPosition = id === "rsvp" ? "center" : "start";
  el.scrollIntoView({ behavior, block });
  return true;
}
