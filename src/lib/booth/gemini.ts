/**
 * Gemini image edit for Photo Booth (identity-preserving 80s restyle).
 *
 * Uses the official `@google/genai` SDK with GEMINI_API_KEY or
 * GOOGLE_GENERATIVE_AI_API_KEY. Prefer this path when a Gemini key is set
 * (see booth/ai.ts).
 *
 * Critical: the guest upload is sent as inline image bytes (not a URL and not
 * a text description). Response must include an IMAGE part.
 */

import { GoogleGenAI, Modality } from "@google/genai";

export const PHOTO_BOOTH_GEMINI_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-nano-banana-2.1";

/**
 * Aspect ratio: env override, else "auto" (match source). Forced 1:1 can
 * recompose vertical selfies and hurt identity / glasses preservation.
 */
export const PHOTO_BOOTH_GEMINI_ASPECT_RATIO_RAW =
  process.env.GEMINI_IMAGE_ASPECT_RATIO?.trim() || "auto";

/** Gemini accepts 1K / 2K / 4K only (case-sensitive). */
export const PHOTO_BOOTH_GEMINI_IMAGE_SIZE = normalizeImageSize(
  process.env.GEMINI_IMAGE_SIZE?.trim() || "2K",
);

/** Lower temperature favors identity lock over creative drift. */
const PHOTO_BOOTH_GEMINI_TEMPERATURE = (() => {
  const raw = Number.parseFloat(
    process.env.GEMINI_IMAGE_TEMPERATURE?.trim() || "0.4",
  );
  if (!Number.isFinite(raw)) return 0.4;
  return Math.min(1, Math.max(0, raw));
})();

const ASPECT_RATIO_CHOICES: Array<{ label: string; value: number }> = [
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "5:4", value: 5 / 4 },
  { label: "3:4", value: 3 / 4 },
  { label: "4:3", value: 4 / 3 },
  { label: "2:3", value: 2 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "9:16", value: 9 / 16 },
  { label: "16:9", value: 16 / 9 },
  { label: "21:9", value: 21 / 9 },
  { label: "1:4", value: 1 / 4 },
  { label: "4:1", value: 4 },
  { label: "1:8", value: 1 / 8 },
  { label: "8:1", value: 8 },
];

function normalizeAspectRatio(raw: string): string | "auto" {
  const v = raw.replace(/\s+/g, "").toLowerCase();
  if (!v || v === "auto" || v === "match" || v === "source") return "auto";
  const allowed = new Set(ASPECT_RATIO_CHOICES.map((c) => c.label));
  // Preserve canonical casing from choices.
  const hit = ASPECT_RATIO_CHOICES.find((c) => c.label.toLowerCase() === v);
  if (hit) return hit.label;
  // Also accept already-canonical labels.
  if (allowed.has(raw.replace(/\s+/g, ""))) return raw.replace(/\s+/g, "");
  return "auto";
}

function normalizeImageSize(raw: string): string {
  const v = raw.trim().toUpperCase();
  if (v === "1K" || v === "2K" || v === "4K") return v;
  if (v === "1" || v === "1024") return "1K";
  if (v === "2" || v === "2048") return "2K";
  if (v === "4" || v === "4096") return "4K";
  return "2K";
}

/** Closest Gemini-supported aspect ratio for source dimensions. */
export function closestGeminiAspectRatio(
  width: number,
  height: number,
): string {
  if (!width || !height || width < 1 || height < 1) return "1:1";
  const target = width / height;
  let best = ASPECT_RATIO_CHOICES[0]!;
  let bestDist = Math.abs(Math.log(target / best.value));
  for (const choice of ASPECT_RATIO_CHOICES) {
    const dist = Math.abs(Math.log(target / choice.value));
    if (dist < bestDist) {
      best = choice;
      bestDist = dist;
    }
  }
  return best.label;
}

function resolveAspectRatio(opts?: {
  width?: number;
  height?: number;
}): string {
  const configured = normalizeAspectRatio(PHOTO_BOOTH_GEMINI_ASPECT_RATIO_RAW);
  if (configured !== "auto") return configured;
  if (opts?.width && opts?.height) {
    return closestGeminiAspectRatio(opts.width, opts.height);
  }
  return "1:1";
}

function parseConcurrency(): number {
  const raw = Number.parseInt(
    process.env.IMAGE_GENERATION_CONCURRENCY?.trim() || "3",
    10,
  );
  if (!Number.isFinite(raw) || raw < 1) return 3;
  return Math.min(raw, 8);
}

export const PHOTO_BOOTH_IMAGE_CONCURRENCY = parseConcurrency();

/** Back-compat export used by health/diagnostics. */
export const PHOTO_BOOTH_GEMINI_ASPECT_RATIO = (() => {
  const configured = normalizeAspectRatio(PHOTO_BOOTH_GEMINI_ASPECT_RATIO_RAW);
  return configured === "auto" ? "auto" : configured;
})();

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
    temperature: PHOTO_BOOTH_GEMINI_TEMPERATURE,
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

function extractText(parts: InlinePart[] | undefined): string {
  if (!parts?.length) return "";
  return parts
    .map((p) => p.text?.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 240);
}

const IDENTITY_SYSTEM_INSTRUCTION = `You are an expert photographic image editor performing image-to-image edits.
Always edit the attached photograph in place. Preserve every person's exact face, skin tone, facial hair, and expression.
If someone wears glasses, keep that they wear glasses but restyle modern clear skinny frames into authentic late-80s eyewear; do not remove glasses.
Return an IMAGE. Never respond with only text. Never invent people from a description.`;

/**
 * Image-to-image edit: send guest photo + identity lock prompt, get restyled image.
 */
export async function generateGeminiEightiesPhoto(opts: {
  imageBytes: Buffer;
  mimeType?: string;
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  signal?: AbortSignal;
}): Promise<{ buffer: Buffer; mime: string; model: string }> {
  const key = geminiApiKey();
  if (!key) {
    throw new GeminiError(
      "GEMINI_API_KEY is not configured (server secret required).",
      "missing_key",
    );
  }

  if (!opts.imageBytes?.length) {
    throw new GeminiError("Missing source image bytes for Gemini edit.", "bad_request");
  }

  const model = opts.model || PHOTO_BOOTH_GEMINI_MODEL;
  const mimeType = opts.mimeType || "image/jpeg";
  const aspectRatio = resolveAspectRatio({
    width: opts.width,
    height: opts.height,
  });
  const ai = new GoogleGenAI({ apiKey: key });

  await acquireGenerationSlot(opts.signal);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  // Image bytes first (primary visual reference), then the master edit prompt.
  const contents = [
    {
      role: "user" as const,
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
  ];

  async function runOnce(modalities: Modality[]) {
    return ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: IDENTITY_SYSTEM_INSTRUCTION,
        temperature: PHOTO_BOOTH_GEMINI_TEMPERATURE,
        // Prefer TEXT+IMAGE so the model returns an edited photo (IMAGE-only
        // sometimes yields empty candidates on edit models).
        responseModalities: modalities,
        imageConfig: {
          aspectRatio,
          imageSize: PHOTO_BOOTH_GEMINI_IMAGE_SIZE,
          personGeneration: "ALLOW_ALL",
        },
        abortSignal: controller.signal,
      },
    });
  }

  try {
    // Docs default / best practice for Nano Banana edits: TEXT + IMAGE.
    let response = await runOnce([Modality.TEXT, Modality.IMAGE]);
    let parts = (response.candidates?.[0]?.content?.parts ||
      []) as InlinePart[];
    let image = extractImage(parts);

    // Retry once with IMAGE-only if the first pass returned text without pixels.
    if (!image) {
      response = await runOnce([Modality.IMAGE]);
      parts = (response.candidates?.[0]?.content?.parts || []) as InlinePart[];
      image = extractImage(parts);
    }

    if (!image) {
      const reason = response.candidates?.[0]?.finishReason;
      const text = extractText(parts);
      throw new GeminiError(
        reason
          ? `Gemini returned no image (${reason})${text ? `: ${text}` : "."}`
          : text
            ? `Gemini returned text instead of an image: ${text}`
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
