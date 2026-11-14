import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashToken(token: string): string {
  return sha256(`booth:${token}`);
}

export function hashIp(ip: string): string {
  return sha256(`ip:${ip || "unknown"}`);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateOtpCode(): string {
  const n = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
