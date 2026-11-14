import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { getPhoto } from "@/lib/booth/db";
import { readBoothSessionFromRequest } from "@/lib/booth/session";
import { getObject, parseStoredRef } from "@/lib/booth/storage";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const photo = await getPhoto(id);
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = requireAdminFromRequest(request);
  const auth = await readBoothSessionFromRequest(request);
  const isOwner = auth && auth.guest.email === photo.guestEmail;
  const isPublicApproved = photo.status === "approved";
  if (!isAdmin && !isOwner && !isPublicApproved) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const ref = parseStoredRef(photo.brandedPath) || parseStoredRef(photo.rawPath);
  if (!ref) return NextResponse.json({ error: "File missing" }, { status: 404 });

  const bytes = await getObject(ref.bucket, ref.path);
  const filename = `landon-jordan-80s-${photo.kind}-${photo.id}.jpg`;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
