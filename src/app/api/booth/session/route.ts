import { NextResponse } from "next/server";
import { getRateLimitStatus, listPhotosForEmail } from "@/lib/booth/db";
import { hashIp } from "@/lib/booth/crypto";
import { boothAiStatus } from "@/lib/booth/ai";
import { BOOTH_COOKIE, clientIp, readBoothSessionFromRequest } from "@/lib/booth/session";
import { objectUrl, parseStoredRef } from "@/lib/booth/storage";

export async function GET(request: Request) {
  const auth = await readBoothSessionFromRequest(request);
  const ai = boothAiStatus();
  if (!auth) {
    return NextResponse.json({
      authenticated: false,
      guest: null,
      photos: [],
      rate: null,
      ai,
    });
  }

  const photos = await listPhotosForEmail(auth.guest.email);
  const rate = await getRateLimitStatus(auth.guest.email, hashIp(clientIp(request)));

  const enriched = await Promise.all(
    photos.map(async (p) => {
      const branded = parseStoredRef(p.brandedPath);
      const raw = parseStoredRef(p.rawPath);
      const thumbRef = branded || raw;
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
        errorMessage: p.errorMessage,
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
