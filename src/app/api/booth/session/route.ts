import { NextResponse } from "next/server";
import { getRateLimitStatus, listPhotosForEmail } from "@/lib/booth/db";
import { hashIp } from "@/lib/booth/crypto";
import { boothAiStatus } from "@/lib/booth/ai";
import { BOOTH_COOKIE, clientIp, readBoothSessionFromRequest } from "@/lib/booth/session";
import { objectUrl, parseStoredRef } from "@/lib/booth/storage";

export async function GET(request: Request) {
  const auth = await readBoothSessionFromRequest(request);
  // Guests only need a boolean — never leak model/provider/env details.
  const ai = { configured: boothAiStatus().configured };
  const ip = hashIp(clientIp(request));
  // Always return IP-based (and email when verified) rate so anon guests see the 5/hr cap.
  const rate = await getRateLimitStatus(auth?.guest.email || null, ip);
  if (!auth) {
    return NextResponse.json({
      authenticated: false,
      guest: null,
      photos: [],
      rate,
      ai,
    });
  }

  const photos = await listPhotosForEmail(auth.guest.email);

  const enriched = await Promise.all(
    photos.map(async (p) => {
      const branded = parseStoredRef(p.brandedPath);
      const raw = parseStoredRef(p.rawPath);
      const thumbRef = raw || branded;
      let url: string | null = null;
      if (thumbRef) {
        try {
          url = await objectUrl(thumbRef.bucket, thumbRef.path, 1800);
        } catch {
          url = null;
        }
      }
      return {
        id: p.id,
        kind: p.kind,
        status: p.status,
        createdAt: p.createdAt,
        submittedToGalleryAt: p.submittedToGalleryAt,
        // Never send provider/DB error strings to the browser.
        errorMessage: null,
        url,
      };
    }),
  );

  return NextResponse.json({
    authenticated: true,
    guest: auth.guest,
    photos: enriched,
    rate,
    ai,
  });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BOOTH_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
