import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { cleanupExpiredTempUploads } from "@/lib/booth/cleanup";

/** Cron / admin: purge expired AI source uploads. */
export async function POST(request: Request) {
  const secret = process.env.BOOTH_CLEANUP_SECRET?.trim();
  const header = request.headers.get("x-booth-cleanup-secret");
  const admin = requireAdminFromRequest(request);
  if (!admin && (!secret || header !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await cleanupExpiredTempUploads();
  return NextResponse.json({ ok: true, ...result });
}
