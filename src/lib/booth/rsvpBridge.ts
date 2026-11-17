/**
 * Shared Photo Booth → RSVP handoff.
 * Source of truth for verified identity is the httpOnly booth session cookie
 * (/api/booth/session). This bridge only carries a client signal so RsvpForm
 * can scroll/prefill immediately after a booth completion.
 */

export const BOOTH_RSVP_HANDOFF_EVENT = "lj:booth-rsvp-handoff";
export const BOOTH_RSVP_HANDOFF_KEY = "lj_booth_rsvp_handoff";

export type BoothRsvpHandoffDetail = {
  firstName: string;
  email: string;
  hasRsvp: boolean;
  /** When true, RsvpForm should jump past email and prefill name/email. */
  prefill: boolean;
  source?: "popup" | "submitted" | "session";
};

export function emitBoothRsvpHandoff(detail: BoothRsvpHandoffDetail) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BOOTH_RSVP_HANDOFF_KEY, JSON.stringify(detail));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(BOOTH_RSVP_HANDOFF_EVENT, { detail }));
}

export function readBoothRsvpHandoff(): BoothRsvpHandoffDetail | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BOOTH_RSVP_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BoothRsvpHandoffDetail;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      firstName: String(parsed.firstName || ""),
      email: String(parsed.email || ""),
      hasRsvp: Boolean(parsed.hasRsvp),
      prefill: Boolean(parsed.prefill),
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export function clearBoothRsvpHandoff() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BOOTH_RSVP_HANDOFF_KEY);
  } catch {
    /* private mode */
  }
}
