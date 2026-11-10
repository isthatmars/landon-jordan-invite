import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { getStore, updateStore } from "@/lib/store";
import type { SiteContent } from "@/lib/types";


export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  return NextResponse.json({ content: store.content });
}

export async function PUT(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Partial<SiteContent> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await updateStore((s) => {
    s.content = {
      ...s.content,
      ...body,
      lineup: body.lineup ?? s.content.lineup,
      updatedAt: new Date().toISOString(),
    };
  });
  return NextResponse.json({ ok: true, content: (await getStore()).content });
}
