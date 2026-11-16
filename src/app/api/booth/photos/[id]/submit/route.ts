import { NextResponse } from "next/server";
import { anonOwnsEmail, isAnonBoothEmail } from "@/lib/booth/anon";
import { claimPhotoToGuest, getPhoto, upsertPhoto } from "@/lib/booth/db";
import { readBoothSessionFromRequest } from "@/lib/booth/session";

/**
 * Permanent gallery association requires a verified booth session.
 * Anonymous drafts created in this browser can be claimed on submit.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await readBoothSessionFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      {
        error: "Verify your email to save this photo to the Party Gallery.",
        needsAuth: true,
      },
      { status: 401 },
    );
  }
  const { id } = await ctx.params;
  let photo = await getPhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const ownsVerified = photo.guestEmail === auth.guest.email;
  const ownsAnonDraft =
    isAnonBoothEmail(photo.guestEmail) && anonOwnsEmail(request, photo.guestEmail);

  if (!ownsVerified && !ownsAnonDraft) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  if (ownsAnonDraft && !ownsVerified) {
    photo = await claimPhotoToGuest(photo, {
      email: auth.guest.email,
      firstName: auth.guest.firstName,
      rsvpId: auth.guest.rsvpId,
    });
  }

  if (photo.status === "failed" || (!photo.rawPath && !photo.brandedPath)) {
    return NextResponse.json({ error: "This photo isn’t ready to submit." }, { status: 400 });
  }
  if (photo.status === "approved" || photo.status === "pending") {
    return NextResponse.json({
      ok: true,
      status: photo.status,
      message:
        photo.status === "approved"
          ? "Already in the party gallery."
          : "Your photo has been received and is awaiting approval. Once approved, it will be added to the event slideshow and Party Gallery.",
    });
  }

  const now = new Date().toISOString();
  await upsertPhoto({
    ...photo,
    status: "pending",
    submittedToGalleryAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    ok: true,
    status: "pending",
    message:
      "Your photo has been received and is awaiting approval. Once approved, it will be added to the event slideshow and Party Gallery.",
  });
}
