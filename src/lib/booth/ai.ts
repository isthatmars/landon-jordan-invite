/**
 * Photo Booth AI — OpenArt only (non-negotiable).
 * See PHOTO_BOOTH.md. Do not wire AI Gateway / Gemini / Replicate here.
 */

import {
  generatePhotoBoothImage,
  OpenArtError,
  openArtConfigured,
} from "@/lib/openart";
import {
  PHOTO_BOOTH_OPENART_MODE,
  PHOTO_BOOTH_OPENART_MODEL,
  PHOTO_BOOTH_TRANSFORM_PROMPT,
} from "@/lib/photoBooth";
import { EIGHTYS_STYLE_PROMPT } from "./types";
import { mockEightiesGrade, sanitizeImage } from "./polaroid";

export type AiGenerateResult =
  | { ok: true; buffer: Buffer; mime: string; model: string; mock: boolean }
  | { ok: false; error: string };

export function boothAiStatus() {
  const mock = process.env.BOOTH_MOCK_AI === "1";
  const openart = openArtConfigured();
  return {
    configured: openart || mock,
    provider: "openart" as const,
    openart,
    gateway: false,
    mock,
    model: PHOTO_BOOTH_OPENART_MODEL,
    mode: PHOTO_BOOTH_OPENART_MODE,
  };
}

async function bufferFromResultUrl(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const match = /^data:[^;,]+;base64,(.+)$/i.exec(url);
    if (!match) throw new OpenArtError("Invalid data URL from OpenArt.");
    return Buffer.from(match[1], "base64");
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new OpenArtError(`Could not download OpenArt result (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Identity-preserving 80s restyle via OpenArt image2image.
 * Mock sharp grade only when BOOTH_MOCK_AI=1 and OpenArt is unavailable.
 */
export async function generateEightiesPhoto(
  sourceBytes: Buffer,
): Promise<AiGenerateResult> {
  const cleaned = await sanitizeImage(sourceBytes);
  const status = boothAiStatus();

  if (!status.configured) {
    return {
      ok: false,
      error:
        "AI photo generation is not configured yet. Set OPENART_TOKEN on the server and try again.",
    };
  }

  if (status.mock && !status.openart) {
    const buffer = await mockEightiesGrade(cleaned.buffer);
    return { ok: true, buffer, mime: "image/jpeg", model: "booth-mock-sharp", mock: true };
  }

  const dataUrl = `data:image/jpeg;base64,${cleaned.buffer.toString("base64")}`;
  const prompt = EIGHTYS_STYLE_PROMPT || PHOTO_BOOTH_TRANSFORM_PROMPT;

  try {
    const result = await generatePhotoBoothImage({
      imageBase64: dataUrl,
      mimeType: "image/jpeg",
      prompt,
      model: PHOTO_BOOTH_OPENART_MODEL,
    });
    const raw = await bufferFromResultUrl(result.imageUrl);
    const buffer = await sanitizeImage(raw);
    return {
      ok: true,
      buffer: buffer.buffer,
      mime: buffer.mime,
      model: `openart:${result.model}`,
      mock: false,
    };
  } catch (err) {
    const message =
      err instanceof OpenArtError
        ? err.message
        : err instanceof Error
          ? err.message
          : "OpenArt generation failed.";
    console.warn("[booth:ai:openart]", message);
    if (status.mock) {
      const buffer = await mockEightiesGrade(cleaned.buffer);
      return {
        ok: true,
        buffer,
        mime: "image/jpeg",
        model: "booth-mock-sharp-fallback",
        mock: true,
      };
    }
    return {
      ok: false,
      error: message.slice(0, 220) || "OpenArt generation failed. Please try again.",
    };
  }
}
