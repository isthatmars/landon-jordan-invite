import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  attachAnonCookie,
  resolveAnonIdentity,
  storageKeyForEmail,
} from "@/lib/booth/anon";
import { saveTemp } from "@/lib/booth/db";
import { sanitizeImage } from "@/lib/booth/polaroid";
import { clientIp, readBoothSessionFromRequest } from "@/lib/booth/session";
import { makeStoredRef, putObject } from "@/lib/booth/storage";
import {
  BOOTH_ALLOWED_MIME,
  BOOTH_MAX_UPLOAD_BYTES,
  BOOTH_TEMP_TTL_MS,
} from "@/lib/booth/types";
import { cleanupExpiredTempUploads } from "@/lib/booth/cleanup";

/** Upload allowed without email verification (anonymous booth cookie). */
export async function POST(request: Request) {
  void cleanupExpiredTempUploads().catch(() => undefined);

  const auth = await readBoothSessionFromRequest(request);
  const anon = auth ? null : resolveAnonIdentity(request);
  const guestEmail = auth?.guest.email || anon!.email;
  const sessionId = auth?.session.id || null;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });

  const file = form.get("file");
  const purpose = String(form.get("purpose") || "ai_source");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (file.size > BOOTH_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Photos must be 10MB or smaller." }, { status: 400 });
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!BOOTH_ALLOWED_MIME.has(mime) && !mime.startsWith("image/")) {
    return NextResponse.json({ error: "Use JPG, PNG, WEBP, or HEIC." }, { status: 400 });
  }

  const raw = Buffer.from(await file.arrayBuffer());
  let cleaned;
  try {
    cleaned = await sanitizeImage(raw);
  } catch {
    return NextResponse.json({ error: "That file didn’t look like a readable photo." }, { status: 400 });
  }

  const id = uid("bup");
  const objectPath = `${storageKeyForEmail(guestEmail)}/${id}.jpg`;
  await putObject("booth-temp", objectPath, cleaned.buffer, "image/jpeg");
  const stored = makeStoredRef("booth-temp", objectPath);
  const expiresAt = new Date(Date.now() + BOOTH_TEMP_TTL_MS).toISOString();

  await saveTemp({
    id,
    guestEmail,
    sessionId,
    path: stored,
    mime: "image/jpeg",
    bytes: cleaned.buffer.length,
    purpose: purpose === "throwback" ? "throwback" : "ai_source",
    expiresAt,
    deletedAt: null,
    createdAt: new Date().toISOString(),
  });

  const res = NextResponse.json({
    ok: true,
    uploadId: id,
    width: cleaned.width,
    height: cleaned.height,
    expiresAt,
    previewUrl: `/api/booth/file?bucket=booth-temp&path=${encodeURIComponent(objectPath)}`,
    anonymous: !auth,
    ip: clientIp(request).slice(0, 0),
  });
  if (anon?.created) attachAnonCookie(res, anon.token);
  return res;
}
