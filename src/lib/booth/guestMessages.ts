/**
 * Guest-facing Photo Booth copy. Never surface provider names, env vars,
 * stack traces, or raw HTTP status codes to visitors.
 */

const TECH_LEAK =
  /GEMINI|OPENART|GOOGLE|GENAI|API[_\s-]?KEY|TOKEN|SUPABASE|BOOTH_MOCK|configured|Invalid body|ECONN|ENOTFOUND|stack|at\s+\S+\(|node_modules|timeout from provider|missing_key|UNAUTHORIZED|PERMISSION_DENIED|INVALID_ARGUMENT|quota|billing/i;

const FALLBACK =
  "We couldn't finish that 80s transform. Please try again in a moment.";

const UPLOAD_FALLBACK = "We couldn't upload that photo. Please try again.";
const VERIFY_FALLBACK = "We couldn't verify that code. Please try again.";
const SAVE_FALLBACK = "We couldn't save that photo. Please try again.";
const GENERIC_FALLBACK = "Something went wrong. Please try again.";

export const BOOTH_GUEST_MESSAGES = {
  aiUnavailable: "AI styling is temporarily unavailable — try again shortly.",
  generateFailed: FALLBACK,
  uploadFailed: UPLOAD_FALLBACK,
  verifyFailed: VERIFY_FALLBACK,
  saveFailed: SAVE_FALLBACK,
  generic: GENERIC_FALLBACK,
} as const;

/** Server: sanitize any provider/internal error before returning JSON to the client. */
export function guestSafeBoothError(
  message: string | null | undefined,
  fallback: string = FALLBACK,
): string {
  const t = (message || "").trim();
  if (!t) return fallback;
  if (TECH_LEAK.test(t)) return fallback;
  if (t.length > 160) return fallback;
  // Soft allowlist for intentional guest copy we already author.
  return t;
}

/** Client: never render raw fetch/status text like "Photo Booth request failed (500)." */
export function guestVisibleBoothError(
  message: string | null | undefined,
  fallback: string = FALLBACK,
): string {
  const t = (message || "").trim();
  if (!t) return fallback;
  if (TECH_LEAK.test(t)) return fallback;
  if (/request failed\s*\(\d+\)/i.test(t)) return fallback;
  if (/Photo Booth returned/i.test(t)) return fallback;
  if (/Empty response/i.test(t)) return fallback;
  if (t.length > 160) return fallback;
  return t;
}
