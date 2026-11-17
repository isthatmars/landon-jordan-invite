/**
 * Photo Booth AI rate-limit exemptions.
 *
 * Uncapped only after email OTP verification, when the verified address:
 * 1. is in OWNER_EMAIL, or
 * 2. is in BOOTH_RATE_LIMIT_ALLOWLIST (comma/semicolon-separated), or
 * 3. matches an RSVP whose name is on the hardcoded party allowlist
 *    (Kathy Jenkins, Jenice Stallings, Jordan Jenkins).
 *
 * Anonymous / unverified guests are never exempt — IP cap always applies.
 */

import { parseOwnerEmails } from "@/lib/notifications";
import { normalizeEmail } from "./crypto";
import { isAnonBoothEmail } from "./anon";

/** Hardcoded names that resolve via RSVP email after booth verify. */
export const BOOTH_RATE_LIMIT_ALLOWLIST_NAMES = [
  { firstName: "Kathy", lastName: "Jenkins" },
  { firstName: "Jenice", lastName: "Stallings" },
  { firstName: "Jordan", lastName: "Jenkins" },
] as const;

function normalizePersonName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, "")
    .replace(/\s+/g, " ");
}

function parseAllowlistEmails(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const email = normalizeEmail(part);
    if (!email || !email.includes("@")) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Emails that skip the 5/hour AI cap once verified (OWNER + env allowlist). */
export function boothRateLimitAllowlistEmails(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of [
    ...parseOwnerEmails(process.env.OWNER_EMAIL).map(normalizeEmail),
    ...parseAllowlistEmails(process.env.BOOTH_RATE_LIMIT_ALLOWLIST),
  ]) {
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function rsvpMatchesAllowlistName(rsvp: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}): boolean {
  const first = normalizePersonName(String(rsvp.firstName || ""));
  const last = normalizePersonName(String(rsvp.lastName || ""));
  const full = normalizePersonName(String(rsvp.fullName || `${first} ${last}`));
  return BOOTH_RATE_LIMIT_ALLOWLIST_NAMES.some((n) => {
    const wantFirst = normalizePersonName(n.firstName);
    const wantLast = normalizePersonName(n.lastName);
    const wantFull = `${wantFirst} ${wantLast}`;
    if (first === wantFirst && last === wantLast) return true;
    if (full === wantFull) return true;
    return false;
  });
}

/**
 * Sync check against env/owner emails only.
 * Callers should also check RSVP name match via {@link rsvpMatchesAllowlistName}.
 */
export function isBoothRateLimitEmailAllowlisted(
  guestEmail: string | null | undefined,
): boolean {
  if (!guestEmail || isAnonBoothEmail(guestEmail)) return false;
  const email = normalizeEmail(guestEmail);
  if (!email) return false;
  return boothRateLimitAllowlistEmails().includes(email);
}
