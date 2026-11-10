import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";


export async function GET() {
  const store = await getStore();
  return NextResponse.json({
    content: store.content,
    tracks: store.tracks,
    videos: store.videos,
  });
}
