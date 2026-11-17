import { NextResponse } from "next/server";

/** Always return a JSON body so clients never hit empty Response.json(). */
export function boothJson(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function boothError(error: string, status = 400, extra?: Record<string, unknown>) {
  return boothJson({ ok: false, error, ...extra }, status);
}

/**
 * Client-side: parse fetch body safely. Empty / non-JSON responses become a
 * structured error instead of throwing "Unexpected end of JSON input".
 */
export async function readBoothJson<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      error: res.ok
        ? "Empty response from Photo Booth server."
        : `Photo Booth request failed (${res.status}).`,
    } as unknown as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      ok: false,
      error: res.ok
        ? "Photo Booth returned an unexpected response."
        : `Photo Booth request failed (${res.status}).`,
    } as unknown as T;
  }
}
