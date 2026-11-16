import { NextResponse } from "next/server";
import { hashToken, normalizeEmail, randomToken, sha256 } from "./crypto";
import { boothCookieOptions } from "./session";

export const BOOTH_ANON_COOKIE = "lj_booth_anon";

/** Stable synthetic email for anonymous booth drafts (never a real mailbox). */
export function anonEmailFromToken(token: string): string {
  return `anon.${sha256(`anon:${token}`).slice(0, 24)}@booth.local`;
}

export function isAnonBoothEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.endsWith("@booth.local") && email.startsWith("anon.");
}

export function readAnonTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${BOOTH_ANON_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function resolveAnonIdentity(request: Request): {
  token: string;
  email: string;
  created: boolean;
} {
  const existing = readAnonTokenFromRequest(request);
  if (existing) {
    return { token: existing, email: anonEmailFromToken(existing), created: false };
  }
  const token = randomToken(24);
  return { token, email: anonEmailFromToken(token), created: true };
}

export function attachAnonCookie(res: NextResponse, token: string) {
  res.cookies.set(BOOTH_ANON_COOKIE, token, {
    ...boothCookieOptions(60 * 60 * 24 * 14),
    httpOnly: true,
  });
  return res;
}

/**
 * Path prefix used for temp/output object keys.
 * Hash-based so keys never contain `@` (breaks unencoded Supabase Storage URLs).
 */
export function storageKeyForEmail(email: string): string {
  return sha256(`booth-storage:${normalizeEmail(email)}`).slice(0, 40);
}

export function anonOwnsEmail(request: Request, guestEmail: string): boolean {
  const token = readAnonTokenFromRequest(request);
  if (!token || !isAnonBoothEmail(guestEmail)) return false;
  return anonEmailFromToken(token) === guestEmail;
}

/** Dev/preview OTP exposure — never in strict production unless explicitly forced. */
export function shouldExposeDevOtp(): boolean {
  if (process.env.BOOTH_DEV_OTP === "1" || process.env.BOOTH_EXPOSE_OTP === "1") {
    return true;
  }
  if (process.env.VERCEL_ENV === "preview") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export function claimTokenHint(anonToken: string): string {
  return hashToken(anonToken).slice(0, 16);
}
