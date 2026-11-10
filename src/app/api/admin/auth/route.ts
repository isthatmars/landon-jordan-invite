import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  getAdminAccessCode,
  requireAdminFromRequest,
} from "@/lib/auth";


export async function GET(request: Request) {
  return NextResponse.json({ authenticated: requireAdminFromRequest(request) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim();
  if (!code || code !== getAdminAccessCode()) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }
  const token = createSessionToken(code);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
