/**
 * Photo Booth AI — multi-provider cascade.
 *
 * Preference when multiple keys exist:
 *   OpenAI Images (OPENAI_API_KEY) → OpenArt (OPENART_TOKEN) → Gemini → mock
 *
 * OpenAI uses POST /v1/images/edits with a fast image model (not chat).
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
import {
  OpenAIBoothError,
  openaiConfigured,
  openaiRuntimeConfig,
  generateOpenAIEightiesPhoto,
  PHOTO_BOOTH_OPENAI_PROMPT,
  resolveOpenAiImageModel,
} from "./openai";
import { buildEightysOpenArtPrompt } from "./types";
import {
  BOOTH_GUEST_MESSAGES,
  guestSafeBoothError,
} from "./guestMessages";
import { mockEightiesGrade, sanitizeImage } from "./polaroid";

export type AiProvider = "openai" | "openart" | "gemini" | "mock" | "none";

export type AiGenerateResult =
  | { ok: true; buffer: Buffer; mime: string; model: string; mock: boolean }
  | { ok: false; error: string; detail?: string };

export function boothAiStatus() {
  const mock = process.env.BOOTH_MOCK_AI === "1";
  const openai = openaiConfigured();
  const openart = openArtConfigured();
  const gemini = geminiConfigured();
  // Prefer OpenAI → OpenArt → Gemini → mock when multiple are configured.
  const provider: AiProvider = openai
    ? "openai"
    : openart
      ? "openart"
      : gemini
        ? "gemini"
        : mock
          ? "mock"
          : "none";
  const geminiCfg = geminiRuntimeConfig();
  const openaiCfg = openaiRuntimeConfig();
  return {
    configured: openai || openart || gemini || mock,
    provider,
    openai,
    openart,
    gemini,
    gateway: false,
    mock,
    model: openai
      ? resolveOpenAiImageModel()
      : openart
        ? PHOTO_BOOTH_OPENART_MODEL
        : gemini
          ? PHOTO_BOOTH_GEMINI_MODEL
          : mock
            ? "booth-mock-sharp"
            : null,
    mode: PHOTO_BOOTH_OPENART_MODE,
    openaiConfig: openai
      ? {
          model: openaiCfg.model,
          size: openaiCfg.size,
          quality: openaiCfg.quality,
        }
      : null,
    geminiConfig: gemini
      ? {
          aspectRatio: geminiCfg.aspectRatio,
          imageSize: geminiCfg.imageSize,
          concurrency: geminiCfg.concurrency,
        }
      : null,
    cascade: [
      openai ? "openai" : null,
      openart ? "openart" : null,
      gemini ? "gemini" : null,
      mock ? "mock" : null,
    ].filter(Boolean) as AiProvider[],
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

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
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

async function runOpenAI(
  cleaned: Buffer,
  prompt: string,
  width?: number,
  height?: number,
): Promise<{ buffer: Buffer; mime: string; model: string }> {
  const result = await generateOpenAIEightiesPhoto({
    imageBytes: cleaned,
    mimeType: "image/jpeg",
    // Shared master prompt (OpenAI / OpenArt / Gemini) with Images-API fallback.
    prompt: prompt || PHOTO_BOOTH_OPENAI_PROMPT,
    model: resolveOpenAiImageModel(),
    width,
    height,
  });
  const buffer = await sanitizeImage(result.buffer);
  return {
    buffer: buffer.buffer,
    mime: buffer.mime,
    model: `openai:${result.model}:${result.size}`,
  };
}

async function runGemini(
  cleaned: Buffer,
  prompt: string,
  width?: number,
  height?: number,
): Promise<{ buffer: Buffer; mime: string; model: string }> {
  const result = await generateGeminiEightiesPhoto({
    imageBytes: cleaned,
    mimeType: "image/jpeg",
    prompt,
    model: PHOTO_BOOTH_GEMINI_MODEL,
    width,
    height,
  });
  const buffer = await sanitizeImage(result.buffer);
  return {
    buffer: buffer.buffer,
    mime: buffer.mime,
    model: `gemini:${result.model}`,
  };
}

type ProviderAttempt = {
  name: "openai" | "openart" | "gemini";
  enabled: boolean;
  run: () => Promise<{ buffer: Buffer; mime: string; model: string }>;
};

/**
 * Identity-preserving 80s restyle.
 * Cascade: OpenAI → OpenArt → Gemini → mock (BOOTH_MOCK_AI=1).
 * Each enabled provider is tried in order; failures fall through.
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
        : "AI photo generation is not configured yet. Set OPENAI_API_KEY (preferred), OPENART_TOKEN, or GEMINI_API_KEY on the server, or BOOTH_MOCK_AI=1 for local smoke tests.",
      detail: "no_provider_configured",
    };
  }

  if (
    status.mock &&
    !status.openai &&
    !status.openart &&
    !status.gemini
  ) {
    const buffer = await mockEightiesGrade(cleaned.buffer);
    return {
      ok: true,
      buffer,
      mime: "image/jpeg",
      model: "booth-mock-sharp",
      mock: true,
    };
  }

  // All providers share the authentic-80s master prompt (full era restyle + face lock).
  const variationSeed =
    (cleaned.width || 1) * 1009 +
    (cleaned.height || 1) * 9176 +
    cleaned.buffer.length +
    Date.now();
  const masterPrompt =
    buildEightysOpenArtPrompt({ variationSeed }) ||
    PHOTO_BOOTH_TRANSFORM_PROMPT ||
    PHOTO_BOOTH_OPENAI_PROMPT;

  const attempts: ProviderAttempt[] = [
    {
      name: "openai",
      enabled: status.openai,
      run: () =>
        runOpenAI(cleaned.buffer, masterPrompt, cleaned.width, cleaned.height),
    },
    {
      name: "openart",
      enabled: status.openart,
      run: () => runOpenArt(cleaned.buffer, masterPrompt),
    },
    {
      name: "gemini",
      enabled: status.gemini,
      run: () =>
        runGemini(cleaned.buffer, masterPrompt, cleaned.width, cleaned.height),
    },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    if (!attempt.enabled) continue;
    try {
      const result = await attempt.run();
      return { ok: true, ...result, mock: false };
    } catch (err) {
      const message =
        err instanceof OpenAIBoothError ||
        err instanceof OpenArtError ||
        err instanceof GeminiError
          ? err.message
          : errMessage(err, `${attempt.name} generation failed.`);
      console.warn(`[booth:ai:${attempt.name}]`, message);
      errors.push(`${attempt.name}: ${message}`);
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

  const detail = errors.join(" | ").slice(0, 500) || "all_providers_failed";
  console.error("[booth:ai:all-failed]", detail);
  return {
    ok: false,
    error: guestFacingError(errors[errors.length - 1] || detail, isProd),
    detail,
  };
}
