import { NextResponse } from "next/server";
import { listApprovedGallery } from "@/lib/booth/db";
import { objectUrl, parseStoredRef } from "@/lib/booth/storage";

/** Public slideshow — approved photos only. */
export async function GET() {
  const photos = await listApprovedGallery();
  const items = await Promise.all(
    photos.map(async (p) => {
      const ref = parseStoredRef(p.brandedPath) || parseStoredRef(p.rawPath);
      let url: string | null = null;
      if (ref) {
        try {
          url = await objectUrl(ref.bucket, ref.path, 1800);
          if (!url.startsWith("http")) {
            url = `${url}${url.includes("?") ? "&" : "?"}photoId=${encodeURIComponent(p.id)}`;
          }
        } catch {
          url = null;
        }
      }
      return {
        id: p.id,
        kind: p.kind,
        firstName: p.guestFirstName,
        url,
        createdAt: p.createdAt,
      };
    }),
  );
  return NextResponse.json({ photos: items.filter((p) => p.url) });
}
