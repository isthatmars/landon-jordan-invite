import { cookies } from "next/headers";

export const ADMIN_COOKIE = "lj_admin_session";

/** Env-configurable access code. Stub default for local/demo. */
export function getAdminAccessCode(): string {
  return process.env.ADMIN_ACCESS_CODE || "NEON80S";
}

export function createSessionToken(code: string): string {
  // Lightweight opaque token (not cryptographic auth — swap for real sessions later)
  return Buffer.from(`lj:${code}:${Date.now()}`).toString("base64url");
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const code = getAdminAccessCode();
    return decoded.startsWith(`lj:${code}:`);
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return isValidSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

export function readBearerOrCookie(
  request: Request,
  cookieHeader?: string | null,
): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export function requireAdminFromRequest(request: Request): boolean {
  const token = readBearerOrCookie(request, request.headers.get("cookie"));
  return isValidSessionToken(token);
}
