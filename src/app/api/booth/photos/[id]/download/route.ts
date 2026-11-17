import { NextResponse } from "next/server";
import { anonOwnsEmail, isAnonBoothEmail } from "@/lib/booth/anon";
import { requireAdminFromRequest } from "@/lib/auth";
import { claimPhotoToGuest, getPhoto } from "@/lib/booth/db";
import { BOOTH_GUEST_MESSAGES, guestSafeBoothError } from "@/lib/booth/guestMessages";
import { readBoothSessionFromRequest } from "@/lib/booth/session";
import { getObject, parseStoredRef } from "@/lib/booth/storage";

/**
 * Guest downloads require a verified booth session (email OTP).
 * Anonymous draft ownership alone is not enough — verify first, then download.
 * After verify, anon drafts in this browser are claimed to the guest (same as gallery save).
 * Admins and publicly approved gallery photos remain accessible without guest OTP.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let photo = await getPhoto(id);
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = requireAdminFromRequest(request);
  const auth = await readBoothSessionFromRequest(request);
  const isPublicApproved = photo.status === "approved";

  if (!isAdmin && !isPublicApproved) {
    if (!auth) {
      return NextResponse.json(
        {
          error: BOOTH_GUEST_MESSAGES.downloadNeedsAuth,
          needsAuth: true,
        },
        { status: 401 },
      );
    }

    const ownsVerified = photo.guestEmail === auth.guest.email;
    const ownsAnonDraft =
      isAnonBoothEmail(photo.guestEmail) && anonOwnsEmail(request, photo.guestEmail);

    if (!ownsVerified && !ownsAnonDraft) {
      return NextResponse.json(
        { error: guestSafeBoothError("Not authorized", BOOTH_GUEST_MESSAGES.generic) },
        { status: 403 },
      );
    }

    if (ownsAnonDraft && !ownsVerified) {
      photo = await claimPhotoToGuest(photo, {
        email: auth.guest.email,
        firstName: auth.guest.firstName,
        rsvpId: auth.guest.rsvpId,
      });
    }
  }

  const ref = parseStoredRef(photo.rawPath) || parseStoredRef(photo.brandedPath);
  if (!ref) return NextResponse.json({ error: "File missing" }, { status: 404 });

  try {
    const bytes = await getObject(ref.bucket, ref.path);
    const filename = `landon-jordan-80s-${photo.kind}-${photo.id}.jpg`;
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("[booth:download]", err);
    return NextResponse.json(
      { error: guestSafeBoothError(null, BOOTH_GUEST_MESSAGES.generic) },
      { status: 500 },
    );
  }
}
