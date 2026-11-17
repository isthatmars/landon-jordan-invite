import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  attachAnonCookie,
  resolveAnonIdentity,
  storageKeyForEmail,
} from "@/lib/booth/anon";
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
import {
  BOOTH_GUEST_MESSAGES,
  guestSafeBoothError,
} from "@/lib/booth/guestMessages";
import { clientIp, readBoothSessionFromRequest } from "@/lib/booth/session";
import { deleteObject, getObject, makeStoredRef, parseStoredRef, putObject } from "@/lib/booth/storage";
import { EIGHTYS_STYLE_PROMPT } from "@/lib/booth/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  void cleanupExpiredTempUploads().catch(() => undefined);

  try {
    const auth = await readBoothSessionFromRequest(request);
    const anon = auth ? null : resolveAnonIdentity(request);
    const guestEmail = auth?.guest.email || anon!.email;
    const guestFirstName = auth?.guest.firstName || "";
    const rsvpId = auth?.guest.rsvpId || null;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: BOOTH_GUEST_MESSAGES.generic },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "That upload expired. Please choose your photo again." },
        { status: 410 },
      );
    }
    if (temp.guestEmail && temp.guestEmail !== guestEmail) {
      return NextResponse.json(
        { error: "Upload does not belong to this guest." },
        { status: 403 },
      );
    }
    if (new Date(temp.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "That upload expired. Please choose your photo again." },
        { status: 410 },
      );
    }

    const ip = hashIp(clientIp(request));
    const rate = await getRateLimitStatus(guestEmail, ip);
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
    // Log master prompt head only — full prompt (+ variation) is built in booth/ai.ts.
    const promptSnippet = EIGHTYS_STYLE_PROMPT.slice(0, 280);

    // Photo row first — booth_generations.photo_id FK references booth_photos(id).
    await upsertPhoto({
      id: photoId,
      kind: "ai",
      guestEmail,
      guestFirstName,
      rsvpId,
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

    await upsertGeneration({
      id: generationId,
      photoId,
      guestEmail,
      rsvpId,
      ipHash: ip,
      status: "running",
      model: null,
      prompt: promptSnippet,
      errorMessage: null,
      startedAt: now,
      finishedAt: null,
      createdAt: now,
    });

    // Atomic-ish: record rate event before calling the model so concurrent requests can't burst.
    await recordRateEvent(guestEmail, ip, "ai_gen");

    const ref = parseStoredRef(temp.path);
    if (!ref) {
      await fail(generationId, photoId, "Missing source upload.");
      return NextResponse.json(
        { error: BOOTH_GUEST_MESSAGES.generateFailed },
        { status: 500 },
      );
    }

    let sourceBytes: Buffer;
    try {
      sourceBytes = await getObject(ref.bucket, ref.path);
    } catch (err) {
      console.error("[booth:generate:read]", err);
      await fail(generationId, photoId, "Could not read your upload.");
      return NextResponse.json(
        { error: "Could not read your upload. Please choose your photo again." },
        { status: 500 },
      );
    }

    const ai = await generateEightiesPhoto(sourceBytes);
    if (!ai.ok) {
      // Real provider detail stays server-side; guests only see soft copy.
      if (ai.detail) {
        console.error("[booth:generate:ai-detail]", ai.detail);
      }
      await fail(generationId, photoId, ai.error, ai.detail);
      return NextResponse.json(
        {
          error: guestSafeBoothError(ai.error, BOOTH_GUEST_MESSAGES.generateFailed),
          photoId,
          generationId,
          rate: await getRateLimitStatus(guestEmail, ip),
        },
        { status: 502 },
      );
    }

    const emailKey = storageKeyForEmail(guestEmail);
    const rawPath = `${emailKey}/${photoId}-raw.jpg`;
    // Store/serve raw AI image only — Polaroid frame + logo are on-screen CSS, never baked into downloads.
    await putObject("booth-outputs", rawPath, ai.buffer, "image/jpeg");

    const finished = new Date().toISOString();
    await upsertPhoto({
      id: photoId,
      kind: "ai",
      guestEmail,
      guestFirstName,
      rsvpId,
      status: "private",
      consentAt: now,
      sourcePath: temp.path,
      rawPath: makeStoredRef("booth-outputs", rawPath),
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
      updatedAt: finished,
    });

    await upsertGeneration({
      id: generationId,
      photoId,
      guestEmail,
      rsvpId,
      ipHash: ip,
      status: "ready",
      model: ai.model,
      prompt: promptSnippet,
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

    const nextRate = await getRateLimitStatus(guestEmail, ip);
    const rawUrl = `/api/booth/file?bucket=booth-outputs&path=${encodeURIComponent(rawPath)}`;
    const res = NextResponse.json({
      ok: true,
      photoId,
      generationId,
      status: "ready",
      mock: ai.mock,
      rate: nextRate,
      rawUrl,
      anonymous: !auth,
      /** @deprecated Prefer rawUrl — downloads are unframed raw AI photos. */
      brandedUrl: rawUrl,
    });
    if (anon?.created) attachAnonCookie(res, anon.token);
    return res;
  } catch (err) {
    console.error("[booth:generate]", err);
    return NextResponse.json(
      { error: BOOTH_GUEST_MESSAGES.generateFailed },
      { status: 500 },
    );
  }
}

async function fail(
  generationId: string,
  photoId: string,
  error: string,
  detail?: string,
) {
  const finished = new Date().toISOString();
  const safe = guestSafeBoothError(error, BOOTH_GUEST_MESSAGES.generateFailed);
  // Persist a short internal hint for ops (no secrets); guest API still soft.
  const stored =
    detail && detail.length > 0
      ? `${safe} [${detail.slice(0, 220)}]`
      : safe;
  try {
    const { getPhoto, getGeneration } = await import("@/lib/booth/db");
    const existing = await getPhoto(photoId);
    if (existing) {
      await upsertPhoto({
        ...existing,
        status: "failed",
        errorMessage: safe,
        updatedAt: finished,
      });
    }
    const gen = await getGeneration(generationId);
    if (gen) {
      await upsertGeneration({
        ...gen,
        status: "failed",
        errorMessage: stored,
        finishedAt: finished,
      });
    }
  } catch (err) {
    console.error("[booth:generate:fail]", err);
  }
}
