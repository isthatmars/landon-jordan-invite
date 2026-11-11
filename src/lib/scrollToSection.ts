/** Smoothly bring a section into view. RSVP uses center so the form plate
 *  sits mid-viewport; other plates keep start (under the fixed header). */
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
  const block: ScrollLogicalPosition = id === "rsvp" ? "center" : "start";
  el.scrollIntoView({ behavior, block });
  return true;
}
