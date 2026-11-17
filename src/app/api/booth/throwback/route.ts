import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  attachAnonCookie,
  resolveAnonIdentity,
  storageKeyForEmail,
} from "@/lib/booth/anon";
import { getTemp, markTempDeleted, upsertPhoto } from "@/lib/booth/db";
import { sanitizeImage } from "@/lib/booth/polaroid";
import { readBoothSessionFromRequest } from "@/lib/booth/session";
import { deleteObject, getObject, makeStoredRef, parseStoredRef, putObject } from "@/lib/booth/storage";

export async function POST(request: Request) {
  const auth = await readBoothSessionFromRequest(request);
  const anon = auth ? null : resolveAnonIdentity(request);
  const guestEmail = auth?.guest.email || anon!.email;
  const guestFirstName = auth?.guest.firstName || "";
  const rsvpId = auth?.guest.rsvpId || null;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const uploadId = String(body.uploadId || "");
  const consent = Boolean(body.consent);
  if (!consent) {
    return NextResponse.json({ error: "Please confirm the consent notice." }, { status: 400 });
  }
  const temp = await getTemp(uploadId);
  if (!temp || temp.deletedAt) {
    return NextResponse.json({ error: "That upload expired. Please choose again." }, { status: 410 });
  }
  if (temp.guestEmail && temp.guestEmail !== guestEmail) {
    return NextResponse.json({ error: "Upload does not belong to this guest." }, { status: 403 });
  }

  const ref = parseStoredRef(temp.path);
  if (!ref) return NextResponse.json({ error: "Missing upload." }, { status: 500 });

  const source = await getObject(ref.bucket, ref.path);
  const cleaned = await sanitizeImage(source);

  const photoId = uid("bphoto");
  const emailKey = storageKeyForEmail(guestEmail);
  const rawPath = `${emailKey}/${photoId}-throwback.jpg`;
  // Raw throwback only — no Polaroid/logo composite for storage or download.
  await putObject("booth-throwbacks", rawPath, cleaned.buffer, "image/jpeg");

  const now = new Date().toISOString();
  await upsertPhoto({
    id: photoId,
    kind: "throwback",
    guestEmail,
    guestFirstName,
    rsvpId,
    status: "private",
    consentAt: now,
    sourcePath: null,
    rawPath: makeStoredRef("booth-throwbacks", rawPath),
    brandedPath: null,
    mime: "image/jpeg",
    width: cleaned.width || null,
    height: cleaned.height || null,
    errorMessage: null,
    submittedToGalleryAt: null,
    moderatedAt: null,
    moderatedBy: null,
    generationId: null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await deleteObject(ref.bucket, ref.path);
    await markTempDeleted(temp.id);
  } catch {
    /* ok */
  }

  const rawUrl = `/api/booth/file?bucket=booth-throwbacks&path=${encodeURIComponent(rawPath)}`;
  const res = NextResponse.json({
    ok: true,
    photoId,
    status: "private",
    rawUrl,
    anonymous: !auth,
    /** @deprecated Prefer rawUrl — downloads are unframed photos. */
    brandedUrl: rawUrl,
    message: "Throwback ready. Verify your email to add it to the Party Gallery.",
  });
  if (anon?.created) attachAnonCookie(res, anon.token);
  return res;
}
