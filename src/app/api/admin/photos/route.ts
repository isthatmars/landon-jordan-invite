import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { getPhoto, listPhotosAdmin, upsertPhoto } from "@/lib/booth/db";
import { objectUrl, parseStoredRef } from "@/lib/booth/storage";
import { boothAiStatus } from "@/lib/booth/ai";

export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const kind = url.searchParams.get("kind") || "all";
  const q = url.searchParams.get("q") || "";
  const photos = await listPhotosAdmin({ status, kind, q });
  const items = await Promise.all(
    photos.map(async (p) => {
      const ref = parseStoredRef(p.brandedPath) || parseStoredRef(p.rawPath);
      let urlStr: string | null = null;
      if (ref) {
        try {
          urlStr = await objectUrl(ref.bucket, ref.path, 1800);
        } catch {
          urlStr = null;
        }
      }
      return { ...p, url: urlStr };
    }),
  );
  return NextResponse.json({ photos: items, ai: boothAiStatus() });
}

export async function PATCH(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : body.id ? [String(body.id)] : [];
  const status = String(body.status || "");
  if (!ids.length || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "ids + status (approved|rejected|pending) required" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const updated = [];
  for (const id of ids) {
    const photo = await getPhoto(id);
    if (!photo) continue;
    const next = {
      ...photo,
      status: status as typeof photo.status,
      moderatedAt: now,
      moderatedBy: "admin",
      updatedAt: now,
      submittedToGalleryAt: photo.submittedToGalleryAt || (status === "approved" ? now : photo.submittedToGalleryAt),
    };
    await upsertPhoto(next);
    updated.push(next);
  }
  return NextResponse.json({ ok: true, updated });
}
