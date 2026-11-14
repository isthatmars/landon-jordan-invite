import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { getPhoto, listPhotosForEmail } from "@/lib/booth/db";
import { readBoothSessionFromRequest } from "@/lib/booth/session";
import { getObject, type BoothBucket } from "@/lib/booth/storage";
import { boothDbEnabled, storageSignedUrl } from "@/lib/booth/supabase";

const BUCKETS = new Set(["booth-temp", "booth-outputs", "booth-throwbacks"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket") || "";
  const objectPath = url.searchParams.get("path") || "";
  if (!BUCKETS.has(bucket) || !objectPath || objectPath.includes("..")) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  const isAdmin = requireAdminFromRequest(request);
  const auth = await readBoothSessionFromRequest(request);

  // Authorize: admin, or guest who owns a photo referencing this path, or own temp path prefix.
  let allowed = isAdmin;
  if (!allowed && auth) {
    const emailKey = auth.guest.email.replace(/[^a-z0-9@._-]/gi, "_");
    if (objectPath.startsWith(`${emailKey}/`) || objectPath.includes(`/${emailKey}/`)) {
      allowed = true;
    } else {
      const photos = await listPhotosForEmail(auth.guest.email);
      allowed = photos.some(
        (p) =>
          p.brandedPath?.includes(objectPath) ||
          p.rawPath?.includes(objectPath) ||
          p.sourcePath?.includes(objectPath),
      );
    }
  }

  // Public approved gallery files
  if (!allowed) {
    // Check if this object belongs to an approved photo (gallery slideshow)
    const photoId = url.searchParams.get("photoId");
    if (photoId) {
      const photo = await getPhoto(photoId);
      if (photo?.status === "approved") {
        const hit =
          photo.brandedPath?.includes(objectPath) || photo.rawPath?.includes(objectPath);
        if (hit) allowed = true;
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (boothDbEnabled()) {
    try {
      const signed = await storageSignedUrl(bucket, objectPath, 120);
      return NextResponse.redirect(signed);
    } catch {
      /* fall through to proxy */
    }
  }

  try {
    const bytes = await getObject(bucket as BoothBucket, objectPath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
