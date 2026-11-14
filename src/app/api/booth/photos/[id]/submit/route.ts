import { NextResponse } from "next/server";
import { getPhoto, upsertPhoto } from "@/lib/booth/db";
import { readBoothSessionFromRequest } from "@/lib/booth/session";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await readBoothSessionFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Verify your email first." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const photo = await getPhoto(id);
  if (!photo || photo.guestEmail !== auth.guest.email) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
  if (photo.status === "failed" || !photo.brandedPath) {
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
