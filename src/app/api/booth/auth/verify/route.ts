import { bumpOtpAttempt, findRsvpByEmail, getLatestOtp } from "@/lib/booth/db";
import { normalizeEmail, safeEqual, sha256 } from "@/lib/booth/crypto";
import { boothError, boothJson } from "@/lib/booth/http";
import {
  BOOTH_COOKIE,
  boothCookieOptions,
  createBoothSession,
} from "@/lib/booth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return boothError("Invalid body", 400);
    }

    const email = normalizeEmail(String((body as { email?: unknown }).email || ""));
    const code = String((body as { code?: unknown }).code || "").replace(/\s+/g, "");
    if (!email || !/^\d{6}$/.test(code)) {
      return boothError("Enter the 6-digit code from your email.", 400);
    }

    const fail = () =>
      boothError("That code didn’t work. Request a new one and try again.", 401);

    let challenge;
    try {
      challenge = await getLatestOtp(email);
    } catch (err) {
      console.warn("[booth:auth:verify:otp]", err);
      return boothError("Could not verify right now. Try again in a moment.", 503);
    }

    // Same generic failure whether missing/wrong — no email existence leak.
    if (!challenge) return fail();
    if (challenge.consumedAt) return fail();
    if (new Date(challenge.expiresAt).getTime() < Date.now()) return fail();
    if (challenge.attempts >= challenge.maxAttempts) return fail();

    const expected = sha256(`otp:${email}:${code}`);
    if (!safeEqual(expected, challenge.codeHash)) {
      await bumpOtpAttempt(challenge.id, challenge.attempts + 1, false).catch(() => undefined);
      return fail();
    }

    await bumpOtpAttempt(challenge.id, challenge.attempts + 1, true).catch(() => undefined);

    // Identity match only — never mark attending / mutate RSVP status.
    const rsvp = await findRsvpByEmail(email).catch(() => null);
    const firstName = challenge.firstName || rsvp?.firstName || "";
    const { token, session } = await createBoothSession({
      email,
      firstName,
      rsvpId: rsvp?.id || null,
    });

    const res = boothJson({
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
  } catch (err) {
    console.warn("[booth:auth:verify]", err);
    return boothError("Verification failed. Please try again.", 500);
  }
}
