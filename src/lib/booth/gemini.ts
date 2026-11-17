/**
 * Gemini image edit for Photo Booth (identity-preserving 80s restyle).
 *
 * Uses the official `@google/genai` SDK with GEMINI_API_KEY or
 * GOOGLE_GENERATIVE_AI_API_KEY. Prefer this path when a Gemini key is set
 * (see booth/ai.ts).
 */

import { GoogleGenAI, Modality } from "@google/genai";

export const PHOTO_BOOTH_GEMINI_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";

export const PHOTO_BOOTH_GEMINI_ASPECT_RATIO =
  process.env.GEMINI_IMAGE_ASPECT_RATIO?.trim() || "16:9";

export const PHOTO_BOOTH_GEMINI_IMAGE_SIZE =
  process.env.GEMINI_IMAGE_SIZE?.trim() || "2K";

function parseConcurrency(): number {
  const raw = Number.parseInt(
    process.env.IMAGE_GENERATION_CONCURRENCY?.trim() || "3",
    10,
  );
  if (!Number.isFinite(raw) || raw < 1) return 3;
  return Math.min(raw, 8);
}

export const PHOTO_BOOTH_IMAGE_CONCURRENCY = parseConcurrency();

export class GeminiError extends Error {
  code: "missing_key" | "bad_request" | "gemini" | "timeout" | "busy";
  constructor(
    message: string,
    code: GeminiError["code"] = "gemini",
  ) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
  }
}

export function geminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ""
  );
}

export function geminiConfigured(): boolean {
  return Boolean(geminiApiKey());
}

export function geminiRuntimeConfig() {
  return {
    configured: geminiConfigured(),
    model: PHOTO_BOOTH_GEMINI_MODEL,
    aspectRatio: PHOTO_BOOTH_GEMINI_ASPECT_RATIO,
    imageSize: PHOTO_BOOTH_GEMINI_IMAGE_SIZE,
    concurrency: PHOTO_BOOTH_IMAGE_CONCURRENCY,
  };
}

/* ---------- process-local concurrency gate ---------- */

let activeGenerations = 0;
const waitQueue: Array<() => void> = [];

async function acquireGenerationSlot(signal?: AbortSignal): Promise<void> {
  if (activeGenerations < PHOTO_BOOTH_IMAGE_CONCURRENCY) {
    activeGenerations += 1;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      const idx = waitQueue.indexOf(wake);
      if (idx >= 0) waitQueue.splice(idx, 1);
      reject(new GeminiError("Gemini request aborted while waiting.", "timeout"));
    };
    const wake = () => {
      signal?.removeEventListener("abort", onAbort);
      activeGenerations += 1;
      resolve();
    };
    if (signal?.aborted) {
      reject(new GeminiError("Gemini request aborted while waiting.", "timeout"));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    waitQueue.push(wake);
  });
}

function releaseGenerationSlot(): void {
  activeGenerations = Math.max(0, activeGenerations - 1);
  const next = waitQueue.shift();
  if (next) next();
}

type InlinePart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};

function extractImage(parts: InlinePart[] | undefined): {
  buffer: Buffer;
  mime: string;
} | null {
  if (!parts?.length) return null;
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (!data) continue;
    const mime = part.inlineData?.mimeType || "image/png";
    return { buffer: Buffer.from(data, "base64"), mime };
  }
  return null;
}

/**
 * Image-to-image edit: send guest photo + identity lock prompt, get restyled image.
 */
export async function generateGeminiEightiesPhoto(opts: {
  imageBytes: Buffer;
  mimeType?: string;
  prompt: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<{ buffer: Buffer; mime: string; model: string }> {
  const key = geminiApiKey();
  if (!key) {
    throw new GeminiError(
      "GEMINI_API_KEY is not configured (server secret required).",
      "missing_key",
    );
  }

  const model = opts.model || PHOTO_BOOTH_GEMINI_MODEL;
  const mimeType = opts.mimeType || "image/jpeg";
  const ai = new GoogleGenAI({ apiKey: key });

  await acquireGenerationSlot(opts.signal);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: opts.imageBytes.toString("base64"),
              },
            },
            { text: opts.prompt },
          ],
        },
      ],
      config: {
        // Image-only keeps latency down for the Polaroid flow.
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          aspectRatio: PHOTO_BOOTH_GEMINI_ASPECT_RATIO,
          imageSize: PHOTO_BOOTH_GEMINI_IMAGE_SIZE,
        },
        abortSignal: controller.signal,
      },
    });

    const parts = (response.candidates?.[0]?.content?.parts ||
      []) as InlinePart[];
    const image = extractImage(parts);
    if (!image) {
      const reason = response.candidates?.[0]?.finishReason;
      throw new GeminiError(
        reason
          ? `Gemini returned no image (${reason}).`
          : "Gemini returned no image.",
        "gemini",
      );
    }

    return { buffer: image.buffer, mime: image.mime, model };
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new GeminiError("Gemini timed out. Please try again.", "timeout");
    }
    const message =
      err instanceof Error ? err.message : "Gemini generation failed.";
    if (/INVALID_ARGUMENT|invalid argument|400/i.test(message)) {
      throw new GeminiError(message.slice(0, 220), "bad_request");
    }
    throw new GeminiError(message.slice(0, 220), "gemini");
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
    releaseGenerationSlot();
  }
}
