import { cookies } from "next/headers";
import { uid } from "@/lib/id";
import {
  deleteSession,
  findRsvpByEmail,
  findSessionByTokenHash,
  resolveGuestFromSession,
  saveSession,
  touchSession,
} from "./db";
import { hashToken, normalizeEmail, randomToken } from "./crypto";
import type { BoothGuest, BoothSessionRecord } from "./types";
import { BOOTH_SESSION_TTL_MS } from "./types";

export const BOOTH_COOKIE = "lj_booth_session";

export async function createBoothSession(input: {
  email: string;
  firstName: string;
  rsvpId?: string | null;
}): Promise<{ token: string; session: BoothSessionRecord }> {
  const email = normalizeEmail(input.email);
  const rsvp = input.rsvpId ? null : await findRsvpByEmail(email);
  const token = randomToken(32);
  const now = Date.now();
  const session: BoothSessionRecord = {
    id: uid("bsess"),
    tokenHash: hashToken(token),
    email,
    firstName: (input.firstName || rsvp?.firstName || "").trim(),
    rsvpId: input.rsvpId || rsvp?.id || null,
    expiresAt: new Date(now + BOOTH_SESSION_TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
  };
  await saveSession(session);
  return { token, session };
}

export function boothCookieOptions(maxAgeSec = Math.floor(BOOTH_SESSION_TTL_MS / 1000)) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSec,
  };
}

export async function readBoothSessionFromRequest(
  request?: Request,
): Promise<{ session: BoothSessionRecord; guest: BoothGuest } | null> {
  let token: string | undefined;
  if (request) {
    const cookie = request.headers.get("cookie") || "";
    const match = cookie.match(new RegExp(`${BOOTH_COOKIE}=([^;]+)`));
    if (match) token = decodeURIComponent(match[1]);
  } else {
    const jar = await cookies();
    token = jar.get(BOOTH_COOKIE)?.value;
  }
  if (!token) return null;
  const session = await findSessionByTokenHash(hashToken(token));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await deleteSession(session.id);
    return null;
  }
  await touchSession(session.id);
  const guest = await resolveGuestFromSession(session);
  return { session, guest };
}

export async function clearBoothSessionCookie() {
  const jar = await cookies();
  jar.set(BOOTH_COOKIE, "", { ...boothCookieOptions(0), maxAge: 0 });
}

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
