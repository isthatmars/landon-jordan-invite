/**
 * Photo Booth AI — Gemini preferred when GEMINI_API_KEY (or
 * GOOGLE_GENERATIVE_AI_API_KEY) is set; OpenArt fallback when OPENART_TOKEN
 * is present. Identity-preserving late-80s / early-90s film prompt stays the same for both.
 * See PHOTO_BOOTH.md.
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
import {
  GeminiError,
  geminiConfigured,
  geminiRuntimeConfig,
  generateGeminiEightiesPhoto,
  PHOTO_BOOTH_GEMINI_MODEL,
} from "./gemini";
import { buildEightysOpenArtPrompt } from "./types";
import {
  BOOTH_GUEST_MESSAGES,
  guestSafeBoothError,
} from "./guestMessages";
import { mockEightiesGrade, sanitizeImage } from "./polaroid";

export type AiProvider = "gemini" | "openart" | "mock" | "none";

export type AiGenerateResult =
  | { ok: true; buffer: Buffer; mime: string; model: string; mock: boolean }
  | { ok: false; error: string };

export function boothAiStatus() {
  const mock = process.env.BOOTH_MOCK_AI === "1";
  const gemini = geminiConfigured();
  const openart = openArtConfigured();
  // Prefer Gemini when its key is set (fastest path to ship on Vercel).
  const provider: AiProvider = gemini
    ? "gemini"
    : openart
      ? "openart"
      : mock
        ? "mock"
        : "none";
  const geminiCfg = geminiRuntimeConfig();
  return {
    configured: gemini || openart || mock,
    provider,
    gemini,
    openart,
    gateway: false,
    mock,
    model: gemini
      ? PHOTO_BOOTH_GEMINI_MODEL
      : openart
        ? PHOTO_BOOTH_OPENART_MODEL
        : mock
          ? "booth-mock-sharp"
          : null,
    mode: PHOTO_BOOTH_OPENART_MODE,
    geminiConfig: gemini
      ? {
          aspectRatio: geminiCfg.aspectRatio,
          imageSize: geminiCfg.imageSize,
          concurrency: geminiCfg.concurrency,
        }
      : null,
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

function guestFacingError(message: string, isProd: boolean): string {
  if (isProd) {
    return guestSafeBoothError(message, BOOTH_GUEST_MESSAGES.generateFailed);
  }
  return message.slice(0, 280);
}

async function runOpenArt(
  cleaned: Buffer,
  prompt: string,
): Promise<{ buffer: Buffer; mime: string; model: string }> {
  const dataUrl = `data:image/jpeg;base64,${cleaned.toString("base64")}`;
  const result = await generatePhotoBoothImage({
    imageBase64: dataUrl,
    mimeType: "image/jpeg",
    prompt,
    model: PHOTO_BOOTH_OPENART_MODEL,
    // Keep identity: do not let OpenArt rewrite the careful lock + scene prompt.
    autoEnhancePrompt: false,
  });
  const raw = await bufferFromResultUrl(result.imageUrl);
  const buffer = await sanitizeImage(raw);
  return {
    buffer: buffer.buffer,
    mime: buffer.mime,
    model: `openart:${result.model}`,
  };
}

/**
 * Identity-preserving 80s restyle.
 * Order: Gemini (if key) → OpenArt (if token) → mock sharp (BOOTH_MOCK_AI=1).
 */
export async function generateEightiesPhoto(
  sourceBytes: Buffer,
): Promise<AiGenerateResult> {
  const cleaned = await sanitizeImage(sourceBytes);
  const status = boothAiStatus();
  const isProd = process.env.NODE_ENV === "production";

  if (!status.configured) {
    return {
      ok: false,
      error: isProd
        ? BOOTH_GUEST_MESSAGES.aiUnavailable
        : "AI photo generation is not configured yet. Set GEMINI_API_KEY (preferred) or OPENART_TOKEN on the server, or BOOTH_MOCK_AI=1 for local smoke tests.",
    };
  }

  if (status.mock && !status.gemini && !status.openart) {
    const buffer = await mockEightiesGrade(cleaned.buffer);
    return { ok: true, buffer, mime: "image/jpeg", model: "booth-mock-sharp", mock: true };
  }

  // Master prompt + light controlled variation (outfit/env/film accents).
  const variationSeed =
    (cleaned.width || 1) * 1009 +
    (cleaned.height || 1) * 9176 +
    cleaned.buffer.length +
    Date.now();
  const prompt =
    buildEightysOpenArtPrompt({ variationSeed }) || PHOTO_BOOTH_TRANSFORM_PROMPT;

  if (status.gemini) {
    try {
      const result = await generateGeminiEightiesPhoto({
        imageBytes: cleaned.buffer,
        mimeType: "image/jpeg",
        prompt,
        model: PHOTO_BOOTH_GEMINI_MODEL,
        width: cleaned.width,
        height: cleaned.height,
      });
      const buffer = await sanitizeImage(result.buffer);
      return {
        ok: true,
        buffer: buffer.buffer,
        mime: buffer.mime,
        model: `gemini:${result.model}`,
        mock: false,
      };
    } catch (err) {
      const message =
        err instanceof GeminiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Gemini generation failed.";
      console.warn("[booth:ai:gemini]", message);

      // Fall through to OpenArt when available.
      if (status.openart) {
        try {
          const oa = await runOpenArt(cleaned.buffer, prompt);
          return { ok: true, ...oa, mock: false };
        } catch (oaErr) {
          const oaMessage =
            oaErr instanceof OpenArtError
              ? oaErr.message
              : oaErr instanceof Error
                ? oaErr.message
                : "OpenArt generation failed.";
          console.warn("[booth:ai:openart-fallback]", oaMessage);
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
            error: guestFacingError(oaMessage, isProd),
          };
        }
      }

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
        error: guestFacingError(message, isProd),
      };
    }
  }

  try {
    const oa = await runOpenArt(cleaned.buffer, prompt);
    return { ok: true, ...oa, mock: false };
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
      error: guestFacingError(message, isProd),
    };
  }
}
