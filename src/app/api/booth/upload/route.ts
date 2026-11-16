import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  attachAnonCookie,
  resolveAnonIdentity,
  storageKeyForEmail,
} from "@/lib/booth/anon";
import { saveTemp } from "@/lib/booth/db";
import { boothError } from "@/lib/booth/http";
import { sanitizeImage } from "@/lib/booth/image";
import { clientIp, readBoothSessionFromRequest } from "@/lib/booth/session";
import { makeStoredRef, putObject } from "@/lib/booth/storage";
import {
  BOOTH_ALLOWED_MIME,
  BOOTH_MAX_UPLOAD_BYTES,
  BOOTH_TEMP_TTL_MS,
} from "@/lib/booth/types";
import { cleanupExpiredTempUploads } from "@/lib/booth/cleanup";

export const runtime = "nodejs";

/** Upload allowed without email verification (anonymous booth cookie). */
export async function POST(request: Request) {
  void cleanupExpiredTempUploads().catch(() => undefined);

  try {
    let auth: Awaited<ReturnType<typeof readBoothSessionFromRequest>> = null;
    try {
      auth = await readBoothSessionFromRequest(request);
    } catch (err) {
      // Bad/expired cookie or transient Supabase session lookup must not block anon upload.
      console.warn("[booth:upload:session]", err);
      auth = null;
    }
    const anon = auth ? null : resolveAnonIdentity(request);
    const guestEmail = auth?.guest.email || anon!.email;
    const sessionId = auth?.session.id || null;

    const form = await request.formData().catch(() => null);
    if (!form) return boothError("Expected multipart form data.", 400);

    const file = form.get("file");
    const purpose = String(form.get("purpose") || "ai_source");
    if (!(file instanceof File)) {
      return boothError("Choose a photo to upload.", 400);
    }
    if (file.size > BOOTH_MAX_UPLOAD_BYTES) {
      return boothError("Photos must be 10MB or smaller.", 400);
    }
    const mime = (file.type || "application/octet-stream").toLowerCase();
    if (!BOOTH_ALLOWED_MIME.has(mime) && !mime.startsWith("image/")) {
      return boothError("Use JPG, PNG, WEBP, or HEIC.", 400);
    }

    const raw = Buffer.from(await file.arrayBuffer());
    let cleaned;
    try {
      cleaned = await sanitizeImage(raw);
    } catch {
      return boothError("That file didn’t look like a readable photo.", 400);
    }

    const id = uid("bup");
    const objectPath = `${storageKeyForEmail(guestEmail)}/${id}.jpg`;
    try {
      await putObject("booth-temp", objectPath, cleaned.buffer, "image/jpeg");
    } catch (err) {
      console.error("[booth:upload:storage]", err);
      return boothError("Could not store that photo. Please try again.", 500);
    }
    const stored = makeStoredRef("booth-temp", objectPath);
    const expiresAt = new Date(Date.now() + BOOTH_TEMP_TTL_MS).toISOString();

    try {
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
    } catch (err) {
      console.error("[booth:upload:db]", err);
      return boothError("Could not save that upload. Please try again.", 500);
    }

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
  } catch (err) {
    console.error("[booth:upload]", err);
    return boothError("Upload failed. Please try again.", 500);
  }
}
