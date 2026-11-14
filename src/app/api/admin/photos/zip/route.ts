import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdminFromRequest } from "@/lib/auth";
import { getPhoto, listPhotosAdmin } from "@/lib/booth/db";
import { getObject, parseStoredRef } from "@/lib/booth/storage";

export async function POST(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  let ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
  if (!ids.length) {
    const approved = await listPhotosAdmin({ status: "approved" });
    ids = approved.map((p) => p.id);
  }
  if (!ids.length) {
    return NextResponse.json({ error: "No photos to download." }, { status: 404 });
  }

  const zip = new JSZip();
  let added = 0;
  for (const id of ids) {
    const photo = await getPhoto(id);
    if (!photo) continue;
    const ref = parseStoredRef(photo.brandedPath) || parseStoredRef(photo.rawPath);
    if (!ref) continue;
    try {
      const bytes = await getObject(ref.bucket, ref.path);
      zip.file(`${photo.kind}-${photo.guestFirstName || "guest"}-${photo.id}.jpg`, bytes);
      added += 1;
    } catch {
      /* skip */
    }
  }
  if (!added) {
    return NextResponse.json({ error: "Could not read photo files." }, { status: 404 });
  }
  const out = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="party-gallery-photos.zip"',
    },
  });
}
