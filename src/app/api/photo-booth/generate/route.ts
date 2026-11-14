import { NextResponse } from "next/server";
import { generatePhotoBoothImage, OpenArtError, openArtConfigured } from "@/lib/openart";
import {
  PHOTO_BOOTH_OPENART_MODE,
  PHOTO_BOOTH_OPENART_MODEL,
  type PhotoBoothGenerateError,
  type PhotoBoothGenerateResponse,
} from "@/lib/photoBooth";

export const runtime = "nodejs";
/** OpenArt image2image can take a while — allow a long server window. */
export const maxDuration = 300;

type Body = {
  imageBase64?: string;
  image?: string;
  mimeType?: string;
  prompt?: string;
};

function err(
  status: number,
  payload: PhotoBoothGenerateError,
) {
  return NextResponse.json(payload, { status });
}

/**
 * Guest capture → OpenArt image2image (identity-preserving 80s Polaroid).
 * Uses server-only OPENART_TOKEN. No alternate image providers.
 */
export async function POST(request: Request) {
  if (!openArtConfigured()) {
    return err(503, {
      ok: false,
      code: "missing_token",
      error:
        "Photo Booth AI is not configured. Set OPENART_TOKEN on the server.",
    });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") {
    return err(400, { ok: false, code: "bad_request", error: "Invalid body." });
  }

  const imageBase64 = (body.imageBase64 || body.image || "").trim();
  if (!imageBase64 || imageBase64.length < 32) {
    return err(400, {
      ok: false,
      code: "bad_request",
      error: "imageBase64 (guest capture) is required.",
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
    const result = await generatePhotoBoothImage({
      imageBase64,
      mimeType: body.mimeType,
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
      model: PHOTO_BOOTH_OPENART_MODEL,
    });
    const payload: PhotoBoothGenerateResponse = {
      ok: true,
      historyId: result.historyId,
      imageUrl: result.imageUrl,
      model: result.model,
      mode: PHOTO_BOOTH_OPENART_MODE,
    };
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof OpenArtError) {
      const status =
        e.code === "missing_token" ? 503 : e.code === "timeout" ? 504 : 502;
      return err(status, { ok: false, code: e.code, error: e.message });
    }
    return err(502, {
      ok: false,
      code: "openart",
      error: e instanceof Error ? e.message : "OpenArt generation failed.",
    });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: "openart",
    model: PHOTO_BOOTH_OPENART_MODEL,
    mode: PHOTO_BOOTH_OPENART_MODE,
    configured: openArtConfigured(),
  });
}
