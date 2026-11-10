import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import { getStore, updateStore } from "@/lib/store";
import type { Track } from "@/lib/types";


export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ tracks: (await getStore()).tracks });
}

export async function PUT(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (Array.isArray(body.tracks)) {
    await updateStore((s) => {
      s.tracks = body.tracks as Track[];
    });
  } else if (body.id) {
    await updateStore((s) => {
      const t = s.tracks.find((x) => x.id === body.id);
      if (!t) return;
      if (typeof body.title === "string") t.title = body.title;
      if (typeof body.artist === "string") t.artist = body.artist;
      if (typeof body.audioUrl === "string") t.audioUrl = body.audioUrl;
      if (typeof body.color === "string") t.color = body.color;
      if (typeof body.sortOrder === "number") t.sortOrder = body.sortOrder;
    });
  } else {
    const track: Track = {
      id: uid("track"),
      title: body.title || "New Track",
      artist: body.artist || "Unknown",
      color: body.color || "#ec4899",
      audioUrl: body.audioUrl || "/audio/beat-it.wav",
      sortOrder: body.sortOrder || 99,
    };
    await updateStore((s) => {
      s.tracks.push(track);
    });
  }
  return NextResponse.json({ ok: true, tracks: (await getStore()).tracks });
}

export async function DELETE(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await updateStore((s) => {
    s.tracks = s.tracks.filter((t) => t.id !== id);
  });
  return NextResponse.json({ ok: true, tracks: (await getStore()).tracks });
}
