import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import { getTemp, markTempDeleted, upsertPhoto } from "@/lib/booth/db";
import { composeBrandedPolaroid, sanitizeImage } from "@/lib/booth/polaroid";
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
  const branded = await composeBrandedPolaroid(cleaned.buffer);

  const photoId = uid("bphoto");
  const emailKey = auth.guest.email.replace(/[^a-z0-9@._-]/gi, "_");
  const rawPath = `${emailKey}/${photoId}-throwback.jpg`;
  const brandedPath = `${emailKey}/${photoId}-polaroid.jpg`;
  await putObject("booth-throwbacks", rawPath, cleaned.buffer, "image/jpeg");
  await putObject("booth-throwbacks", brandedPath, branded, "image/jpeg");

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
    brandedPath: makeStoredRef("booth-throwbacks", brandedPath),
    mime: "image/jpeg",
    width: 996,
    height: 1168,
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

  return NextResponse.json({
    ok: true,
    photoId,
    status: "pending",
    brandedUrl: `/api/booth/file?bucket=booth-throwbacks&path=${encodeURIComponent(brandedPath)}`,
    message:
      "Your photo has been received and is awaiting approval. Once approved, it will be added to the event slideshow and Party Gallery.",
  });
}
