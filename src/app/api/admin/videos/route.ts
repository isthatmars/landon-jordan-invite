import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import { getStore, updateStore } from "@/lib/store";
import type { VideoItem } from "@/lib/types";
import { normalizeVideoItem, normalizeVideos } from "@/lib/videos";


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
      s.videos = normalizeVideos(body.videos as VideoItem[]);
    });
  } else if (body.id) {
    await updateStore((s) => {
      const index = s.videos.findIndex((x) => x.id === body.id);
      if (index < 0) return;
      const current = s.videos[index];
      const next: VideoItem = {
        ...current,
        title: typeof body.title === "string" ? body.title : current.title,
        artist: typeof body.artist === "string" ? body.artist : current.artist,
        videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : current.videoUrl,
        youtubeId: typeof body.youtubeId === "string" ? body.youtubeId : current.youtubeId,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : current.sortOrder,
        posterUrl: current.posterUrl,
      };
      s.videos[index] = normalizeVideoItem(next);
    });
  } else {
    const video = normalizeVideoItem({
      id: uid("video"),
      title: body.title || "New Video",
      artist: body.artist || "Unknown",
      posterUrl: "",
      youtubeId: body.youtubeId || "",
      videoUrl: body.videoUrl || "",
      sortOrder: body.sortOrder || 99,
    });
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
