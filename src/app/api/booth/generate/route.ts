import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import { generateEightiesPhoto } from "@/lib/booth/ai";
import { cleanupExpiredTempUploads } from "@/lib/booth/cleanup";
import {
  getRateLimitStatus,
  getTemp,
  markTempDeleted,
  recordRateEvent,
  upsertGeneration,
  upsertPhoto,
} from "@/lib/booth/db";
import { hashIp } from "@/lib/booth/crypto";
import { composeBrandedPolaroid } from "@/lib/booth/polaroid";
import { clientIp, readBoothSessionFromRequest } from "@/lib/booth/session";
import { deleteObject, getObject, makeStoredRef, parseStoredRef, putObject } from "@/lib/booth/storage";
import { EIGHTYS_STYLE_PROMPT } from "@/lib/booth/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  void cleanupExpiredTempUploads().catch(() => undefined);

  const auth = await readBoothSessionFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Verify your email to create an 80s photo." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const uploadId = String(body.uploadId || "");
  const consent = Boolean(body.consent);
  if (!consent) {
    return NextResponse.json(
      { error: "Please confirm the consent notice before generating." },
      { status: 400 },
    );
  }
  if (!uploadId) {
    return NextResponse.json({ error: "Upload a photo first." }, { status: 400 });
  }

  const temp = await getTemp(uploadId);
  if (!temp || temp.deletedAt) {
    return NextResponse.json({ error: "That upload expired. Please choose your photo again." }, { status: 410 });
  }
  if (temp.guestEmail && temp.guestEmail !== auth.guest.email) {
    return NextResponse.json({ error: "Upload does not belong to this guest." }, { status: 403 });
  }
  if (new Date(temp.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "That upload expired. Please choose your photo again." }, { status: 410 });
  }

  const ip = hashIp(clientIp(request));
  const rate = await getRateLimitStatus(auth.guest.email, ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "You’ve hit the limit of 5 AI photos per hour.",
        rate,
      },
      { status: 429 },
    );
  }

  const generationId = uid("bgen");
  const photoId = uid("bphoto");
  const now = new Date().toISOString();

  await upsertGeneration({
    id: generationId,
    photoId,
    guestEmail: auth.guest.email,
    rsvpId: auth.guest.rsvpId,
    ipHash: ip,
    status: "running",
    model: null,
    prompt: EIGHTYS_STYLE_PROMPT.slice(0, 280),
    errorMessage: null,
    startedAt: now,
    finishedAt: null,
    createdAt: now,
  });

  await upsertPhoto({
    id: photoId,
    kind: "ai",
    guestEmail: auth.guest.email,
    guestFirstName: auth.guest.firstName,
    rsvpId: auth.guest.rsvpId,
    status: "private",
    consentAt: now,
    sourcePath: temp.path,
    rawPath: null,
    brandedPath: null,
    mime: "image/jpeg",
    width: null,
    height: null,
    errorMessage: null,
    submittedToGalleryAt: null,
    moderatedAt: null,
    moderatedBy: null,
    generationId,
    createdAt: now,
    updatedAt: now,
  });

  // Atomic-ish: record rate event before calling the model so concurrent requests can't burst.
  await recordRateEvent(auth.guest.email, ip, "ai_gen");

  const ref = parseStoredRef(temp.path);
  if (!ref) {
    await fail(generationId, photoId, "Missing source upload.");
    return NextResponse.json({ error: "Missing source upload." }, { status: 500 });
  }

  let sourceBytes: Buffer;
  try {
    sourceBytes = await getObject(ref.bucket, ref.path);
  } catch {
    await fail(generationId, photoId, "Could not read your upload.");
    return NextResponse.json({ error: "Could not read your upload." }, { status: 500 });
  }

  const ai = await generateEightiesPhoto(sourceBytes);
  if (!ai.ok) {
    await fail(generationId, photoId, ai.error);
    return NextResponse.json({ error: ai.error, photoId, generationId, rate: await getRateLimitStatus(auth.guest.email, ip) }, { status: 502 });
  }

  const emailKey = auth.guest.email.replace(/[^a-z0-9@._-]/gi, "_");
  const rawPath = `${emailKey}/${photoId}-raw.jpg`;
  const brandedPath = `${emailKey}/${photoId}-polaroid.jpg`;
  let branded: Buffer;
  try {
    branded = await composeBrandedPolaroid(ai.buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not brand Polaroid.";
    await fail(generationId, photoId, msg);
    return NextResponse.json({ error: msg, photoId, generationId }, { status: 500 });
  }

  await putObject("booth-outputs", rawPath, ai.buffer, "image/jpeg");
  await putObject("booth-outputs", brandedPath, branded, "image/jpeg");

  const finished = new Date().toISOString();
  await upsertPhoto({
    id: photoId,
    kind: "ai",
    guestEmail: auth.guest.email,
    guestFirstName: auth.guest.firstName,
    rsvpId: auth.guest.rsvpId,
    status: "private",
    consentAt: now,
    sourcePath: temp.path,
    rawPath: makeStoredRef("booth-outputs", rawPath),
    brandedPath: makeStoredRef("booth-outputs", brandedPath),
    mime: "image/jpeg",
    width: 996,
    height: 1328,
    errorMessage: null,
    submittedToGalleryAt: null,
    moderatedAt: null,
    moderatedBy: null,
    generationId,
    createdAt: now,
    updatedAt: finished,
  });

  await upsertGeneration({
    id: generationId,
    photoId,
    guestEmail: auth.guest.email,
    rsvpId: auth.guest.rsvpId,
    ipHash: ip,
    status: "ready",
    model: ai.model,
    prompt: EIGHTYS_STYLE_PROMPT.slice(0, 280),
    errorMessage: null,
    startedAt: now,
    finishedAt: finished,
    createdAt: now,
  });

  // Delete temp original ASAP (≤30 min policy; do it now after success).
  try {
    await deleteObject(ref.bucket, ref.path);
    await markTempDeleted(temp.id);
  } catch {
    /* cleanup job will retry */
  }

  const nextRate = await getRateLimitStatus(auth.guest.email, ip);
  return NextResponse.json({
    ok: true,
    photoId,
    generationId,
    status: "ready",
    mock: ai.mock,
    rate: nextRate,
    brandedUrl: `/api/booth/file?bucket=booth-outputs&path=${encodeURIComponent(brandedPath)}`,
    rawUrl: `/api/booth/file?bucket=booth-outputs&path=${encodeURIComponent(rawPath)}`,
  });
}

async function fail(generationId: string, photoId: string, error: string) {
  const finished = new Date().toISOString();
  const photo = {
    id: photoId,
    kind: "ai" as const,
    guestEmail: "",
    guestFirstName: "",
    rsvpId: null,
    status: "failed" as const,
    consentAt: null,
    sourcePath: null,
    rawPath: null,
    brandedPath: null,
    mime: "image/jpeg",
    width: null,
    height: null,
    errorMessage: error,
    submittedToGalleryAt: null,
    moderatedAt: null,
    moderatedBy: null,
    generationId,
    createdAt: finished,
    updatedAt: finished,
  };
  // Keep existing guest fields by patching via get — simplified: upsert failure status only through generation + minimal photo update
  const { getPhoto } = await import("@/lib/booth/db");
  const existing = await getPhoto(photoId);
  if (existing) {
    await upsertPhoto({
      ...existing,
      status: "failed",
      errorMessage: error,
      updatedAt: finished,
    });
  } else {
    await upsertPhoto(photo);
  }
  const gen = await import("@/lib/booth/db").then((m) => m.getGeneration(generationId));
  if (gen) {
    await upsertGeneration({
      ...gen,
      status: "failed",
      errorMessage: error,
      finishedAt: finished,
    });
  }
}
