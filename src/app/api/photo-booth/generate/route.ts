import { NextResponse } from "next/server";
import { boothAiStatus, generateEightiesPhoto } from "@/lib/booth/ai";
import {
  BOOTH_GUEST_MESSAGES,
  guestSafeBoothError,
} from "@/lib/booth/guestMessages";
import {
  PHOTO_BOOTH_OPENART_MODE,
  type PhotoBoothGenerateError,
  type PhotoBoothGenerateResponse,
} from "@/lib/photoBooth";

export const runtime = "nodejs";
/** Gemini / OpenArt image edit can take a bit — allow a long server window. */
export const maxDuration = 300;

type Body = {
  imageBase64?: string;
  image?: string;
  mimeType?: string;
  prompt?: string;
};

function err(status: number, payload: PhotoBoothGenerateError) {
  return NextResponse.json(payload, { status });
}

function parseImageInput(input: string): Buffer {
  const trimmed = input.trim();
  const match = /^data:[^;,]+;base64,(.+)$/i.exec(trimmed);
  if (match) return Buffer.from(match[1], "base64");
  return Buffer.from(trimmed, "base64");
}

/**
 * Guest capture → Gemini (preferred) or OpenArt image2image.
 * Identity-preserving 80s Polaroid restyle.
 */
export async function POST(request: Request) {
  const status = boothAiStatus();
  if (!status.configured) {
    return err(503, {
      ok: false,
      code: "missing_token",
      error: BOOTH_GUEST_MESSAGES.aiUnavailable,
    });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") {
    return err(400, {
      ok: false,
      code: "bad_request",
      error: BOOTH_GUEST_MESSAGES.generic,
    });
  }

  const imageBase64 = (body.imageBase64 || body.image || "").trim();
  if (!imageBase64 || imageBase64.length < 32) {
    return err(400, {
      ok: false,
      code: "bad_request",
      error: "Please upload a photo first.",
    });
  }
  // Soft size guard (~8MB base64).
  if (imageBase64.length > 12_000_000) {
    return err(400, {
      ok: false,
      code: "bad_request",
      error: "Image is too large. Try a smaller capture.",
    });
  }

  try {
    const source = parseImageInput(imageBase64);
    const ai = await generateEightiesPhoto(source);
    if (!ai.ok) {
      return err(502, {
        ok: false,
        code: "gemini",
        error: guestSafeBoothError(ai.error, BOOTH_GUEST_MESSAGES.generateFailed),
      });
    }
    const mime = ai.mime || "image/jpeg";
    const imageUrl = `data:${mime};base64,${ai.buffer.toString("base64")}`;
    const payload: PhotoBoothGenerateResponse = {
      ok: true,
      historyId: `booth-${Date.now()}`,
      imageUrl,
      model: ai.model,
      mode: PHOTO_BOOTH_OPENART_MODE,
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[photo-booth:generate]", e);
    return err(502, {
      ok: false,
      code: "gemini",
      error: BOOTH_GUEST_MESSAGES.generateFailed,
    });
  }
}

/** Public status is booleans only — no model/provider names. */
export async function GET() {
  const status = boothAiStatus();
  return NextResponse.json({
    ok: true,
    configured: status.configured,
  });
}
