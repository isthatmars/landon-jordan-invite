import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import { getStore, updateStore } from "@/lib/store";
import type { VideoItem } from "@/lib/types";


export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ videos: (await getStore()).videos });
}

export async function PUT(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (Array.isArray(body.videos)) {
    await updateStore((s) => {
      s.videos = body.videos as VideoItem[];
    });
  } else if (body.id) {
    await updateStore((s) => {
      const v = s.videos.find((x) => x.id === body.id);
      if (!v) return;
      if (typeof body.title === "string") v.title = body.title;
      if (typeof body.artist === "string") v.artist = body.artist;
      if (typeof body.posterUrl === "string") v.posterUrl = body.posterUrl;
      if (typeof body.videoUrl === "string") v.videoUrl = body.videoUrl;
      if (typeof body.sortOrder === "number") v.sortOrder = body.sortOrder;
    });
  } else {
    const video: VideoItem = {
      id: uid("video"),
      title: body.title || "New Video",
      artist: body.artist || "Unknown",
      posterUrl: body.posterUrl || "/images/crt-tv.jpg",
      videoUrl: body.videoUrl || "",
      sortOrder: body.sortOrder || 99,
    };
    await updateStore((s) => {
      s.videos.push(video);
    });
  }
  return NextResponse.json({ ok: true, videos: (await getStore()).videos });
}

export async function DELETE(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await updateStore((s) => {
    s.videos = s.videos.filter((v) => v.id !== id);
  });
  return NextResponse.json({ ok: true, videos: (await getStore()).videos });
}
