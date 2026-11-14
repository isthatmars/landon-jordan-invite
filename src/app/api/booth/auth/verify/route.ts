import { NextResponse } from "next/server";
import { bumpOtpAttempt, findRsvpByEmail, getLatestOtp } from "@/lib/booth/db";
import { normalizeEmail, safeEqual, sha256 } from "@/lib/booth/crypto";
import {
  BOOTH_COOKIE,
  boothCookieOptions,
  createBoothSession,
} from "@/lib/booth/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email || ""));
  const code = String(body.code || "").replace(/\s+/g, "");
  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  }

  const challenge = await getLatestOtp(email);
  // Same generic failure whether missing/wrong — no email existence leak.
  const fail = () =>
    NextResponse.json({ error: "That code didn’t work. Request a new one and try again." }, { status: 401 });

  if (!challenge) return fail();
  if (challenge.consumedAt) return fail();
  if (new Date(challenge.expiresAt).getTime() < Date.now()) return fail();
  if (challenge.attempts >= challenge.maxAttempts) return fail();

  const expected = sha256(`otp:${email}:${code}`);
  if (!safeEqual(expected, challenge.codeHash)) {
    await bumpOtpAttempt(challenge.id, challenge.attempts + 1, false);
    return fail();
  }

  await bumpOtpAttempt(challenge.id, challenge.attempts + 1, true);
  const rsvp = await findRsvpByEmail(email).catch(() => null);
  const firstName = challenge.firstName || rsvp?.firstName || "";
  const { token, session } = await createBoothSession({
    email,
    firstName,
    rsvpId: rsvp?.id || null,
  });

  const res = NextResponse.json({
    ok: true,
    guest: {
      email: session.email,
      firstName: session.firstName,
      rsvpId: session.rsvpId,
      hasRsvp: Boolean(rsvp),
      attend: rsvp?.attend || null,
    },
  });
  res.cookies.set(BOOTH_COOKIE, token, boothCookieOptions());
  return res;
}
