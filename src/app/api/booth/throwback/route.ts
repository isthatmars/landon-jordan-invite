import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import { getTemp, markTempDeleted, upsertPhoto } from "@/lib/booth/db";
import { sanitizeImage } from "@/lib/booth/polaroid";
import { readBoothSessionFromRequest } from "@/lib/booth/session";
import { deleteObject, getObject, makeStoredRef, parseStoredRef, putObject } from "@/lib/booth/storage";

export async function POST(request: Request) {
  const auth = await readBoothSessionFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Verify your email to upload a throwback." }, { status: 401 });
  }

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
  if (temp.guestEmail && temp.guestEmail !== auth.guest.email) {
    return NextResponse.json({ error: "Upload does not belong to this guest." }, { status: 403 });
  }

  const ref = parseStoredRef(temp.path);
  if (!ref) return NextResponse.json({ error: "Missing upload." }, { status: 500 });

  const source = await getObject(ref.bucket, ref.path);
  const cleaned = await sanitizeImage(source);

  const photoId = uid("bphoto");
  const emailKey = auth.guest.email.replace(/[^a-z0-9@._-]/gi, "_");
  const rawPath = `${emailKey}/${photoId}-throwback.jpg`;
  // Raw throwback only — no Polaroid/logo composite for storage or download.
  await putObject("booth-throwbacks", rawPath, cleaned.buffer, "image/jpeg");

  const now = new Date().toISOString();
  await upsertPhoto({
    id: photoId,
    kind: "throwback",
    guestEmail: auth.guest.email,
    guestFirstName: auth.guest.firstName,
    rsvpId: auth.guest.rsvpId,
    status: "pending",
    consentAt: now,
    sourcePath: null,
    rawPath: makeStoredRef("booth-throwbacks", rawPath),
    brandedPath: null,
    mime: "image/jpeg",
    width: cleaned.width || null,
    height: cleaned.height || null,
    errorMessage: null,
    submittedToGalleryAt: now,
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
  return NextResponse.json({
    ok: true,
    photoId,
    status: "pending",
    rawUrl,
    /** @deprecated Prefer rawUrl — downloads are unframed photos. */
    brandedUrl: rawUrl,
    message:
      "Your photo has been received and is awaiting approval. Once approved, it will be added to the event slideshow and Party Gallery.",
  });
}
