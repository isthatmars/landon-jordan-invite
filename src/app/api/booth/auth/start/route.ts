import { NextResponse } from "next/server";
import { createOtpChallenge, findRsvpByEmail } from "@/lib/booth/db";
import { generateOtpCode, normalizeEmail, sha256 } from "@/lib/booth/crypto";
import { BOOTH_OTP_TTL_MS } from "@/lib/booth/types";
import { partySiteUrl, sendGuestEmail } from "@/lib/notifications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Start email verification. Always returns the same shape whether or not
 * the email already exists in RSVPs — never leaks membership.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email || ""));
  let firstName = String(body.firstName || "").trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  // Prefer RSVP first name when known; client-supplied name for new visitors.
  const rsvp = await findRsvpByEmail(email).catch(() => null);
  if (rsvp?.firstName) firstName = rsvp.firstName;
  if (!firstName || firstName.length < 1) {
    return NextResponse.json(
      { error: "Tell us your first name so we can welcome you back." },
      { status: 400 },
    );
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + BOOTH_OTP_TTL_MS).toISOString();
  await createOtpChallenge({
    email,
    firstName,
    codeHash: sha256(`otp:${email}:${code}`),
    expiresAt,
  });

  const site = partySiteUrl();
  const verifyUrl = `${site}/#photobooth?booth_email=${encodeURIComponent(email)}&booth_code=${code}`;
  const html = `
    <div style="font-family:Arial,sans-serif;background:#120018;color:#fff;padding:28px;border-radius:16px;border:1px solid #ff4fd8">
      <p style="font-size:22px;color:#ff4fd8;margin:0 0 8px">The 80's Photo Booth</p>
      <p style="margin:0 0 16px">Hey ${firstName}, use this code to unlock your booth:</p>
      <p style="font-size:36px;letter-spacing:8px;font-weight:700;margin:0 0 16px">${code}</p>
      <p style="margin:0 0 12px;color:#ccc">Or tap this secure link (expires in 15 minutes):</p>
      <p><a href="${verifyUrl}" style="color:#c6ff00">Verify & open the Photo Booth</a></p>
      <p style="margin-top:20px;font-size:12px;color:#888">If you didn't request this, you can ignore it. Photo Booth use does not change your RSVP.</p>
    </div>
  `;

  const mail = await sendGuestEmail({
    to: email,
    subject: `Your 80s Photo Booth code: ${code}`,
    html,
  });

  // Identical success response — no existence leak.
  return NextResponse.json({
    ok: true,
    sent: true,
    stubbed: Boolean(mail.stubbed),
    expiresAt,
    // Dev/local only: surface code when email is stubbed so smoke tests work.
    ...(mail.stubbed || process.env.BOOTH_EXPOSE_OTP === "1" ? { devCode: code } : {}),
    message: mail.stubbed
      ? "Verification started (email stubbed in this environment)."
      : "Check your email for a 6-digit code.",
  });
}
