/**
 * OpenAI Images edit for Photo Booth (identity-preserving 80s restyle).
 *
 * Uses POST /v1/images/edits (not chat completions). Default model is the
 * fast Flare tier; chat models in OPENAI_MODEL (e.g. gpt-5.2) are ignored.
 */

export const PHOTO_BOOTH_OPENAI_DEFAULT_MODEL = "gpt-image-2.5-flare";

/**
 * OpenAI Images edit prompt — aligned with PHOTO_BOOTH_MASTER_PROMPT /
 * EIGHTYS_STYLE_PROMPT (source of truth in booth/types.ts). Kept concise for
 * the Images API while covering identity, period eyewear, and anti-cliché wardrobe.
 */
export const PHOTO_BOOTH_OPENAI_PROMPT = [
  "What would this picture look like if it were taken in the 80's? Retain facial features.",
  "Edit in place. Keep exact face shape, features, skin tone, facial hair, expression, people count, pose, and framing.",
  "If the subject wears glasses, keep that they wear glasses but restyle modern clear skinny rectangular frames into authentic late-80s eyewear (larger acetate frames, classic aviators, or period plastic frames). Do not leave modern clear skinny frames unchanged. Do not remove glasses.",
  "Clothing: flattering period-appropriate 1985–89 fashion that fits this person's vibe, with a varied natural real-world 80s palette — do NOT default to a neon teal/magenta/blue windbreaker costume stereotype.",
  "Background: period-plausible environment from the original context, natural light. Consumer film look: grain, mild warm or cool film stock — not Instagram teal-magenta, not plastic AI skin, not costume-party neon overload.",
  "No text, logos, watermarks, or Polaroid borders. Return one photorealistic edited photograph.",
].join(" ");

const CHAT_MODEL_RE =
  /^(gpt-5|gpt-4|gpt-3\.5|o[1-9]|chatgpt|o3|o4)/i;

const IMAGE_MODEL_HINT =
  /image|dall-?e|sunburst|flare|gpt-image/i;

export type OpenAiImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export class OpenAIBoothError extends Error {
  code: "missing_key" | "bad_request" | "openai" | "timeout" | "bad_response";

  constructor(
    message: string,
    code: OpenAIBoothError["code"] = "openai",
  ) {
    super(message);
    this.name = "OpenAIBoothError";
    this.code = code;
  }
}

/** @deprecated Prefer OpenAIBoothError — kept for any transitional imports. */
export const OpenAiError = OpenAIBoothError;

export function openaiApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

/** True when OPENAI_API_KEY is set (server-only). */
export function openaiConfigured(): boolean {
  return Boolean(openaiApiKey());
}

/**
 * Resolve the Images API model.
 * Prefer OPENAI_IMAGE_MODEL. If OPENAI_MODEL looks like a chat model
 * (gpt-5.2, etc.), ignore it and use the fast image default.
 */
export function resolveOpenAiImageModel(): string {
  const imageEnv = process.env.OPENAI_IMAGE_MODEL?.trim();
  if (imageEnv) return imageEnv;

  const generic = process.env.OPENAI_MODEL?.trim();
  if (
    generic &&
    IMAGE_MODEL_HINT.test(generic) &&
    !CHAT_MODEL_RE.test(generic)
  ) {
    return generic;
  }
  // Chat models (gpt-5.2, gpt-4o, …) are not valid for /v1/images/edits.
  return PHOTO_BOOTH_OPENAI_DEFAULT_MODEL;
}

export const PHOTO_BOOTH_OPENAI_MODEL = resolveOpenAiImageModel();

function resolveQuality(): string {
  const raw =
    process.env.OPENAI_IMAGE_QUALITY?.trim()?.toLowerCase() || "medium";
  const allowed = new Set([
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "auto",
  ]);
  return allowed.has(raw) ? raw : "medium";
}

/**
 * Portrait-first size selection.
 * - Source wider than tall → landscape 1536x1024 (do not force landscape onto
 *   portrait uploads).
 * - Otherwise → portrait 1024x1536 (portrait + square / unknown).
 * Env OPENAI_IMAGE_SIZE can force a WxH preset.
 */
export function resolveOpenAiImageSize(opts?: {
  width?: number;
  height?: number;
}): OpenAiImageSize {
  const forced = process.env.OPENAI_IMAGE_SIZE?.trim().toLowerCase();
  if (
    forced === "1024x1024" ||
    forced === "1024x1536" ||
    forced === "1536x1024"
  ) {
    return forced;
  }
  if (forced === "portrait" || forced === "2:3") return "1024x1536";
  if (forced === "landscape" || forced === "3:2") return "1536x1024";
  if (forced === "square") return "1024x1024";
  // "auto" or unset → portrait-first, matching source orientation.
  if (forced && forced !== "auto") {
    // Unknown value — fall through to source-aware default.
  }

  const w = opts?.width ?? 0;
  const h = opts?.height ?? 0;
  if (w > 0 && h > 0 && w > h) return "1536x1024";
  return "1024x1536";
}

export function openaiRuntimeConfig(opts?: {
  width?: number;
  height?: number;
}) {
  return {
    configured: openaiConfigured(),
    model: resolveOpenAiImageModel(),
    size: resolveOpenAiImageSize(opts),
    quality: resolveQuality(),
    prompt: PHOTO_BOOTH_OPENAI_PROMPT,
  };
}

type EditJson = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

/**
 * Identity-preserving 80s restyle via OpenAI Images edit API.
 */
export async function generateOpenAIEightiesPhoto(opts: {
  imageBytes: Buffer;
  mimeType?: string;
  prompt?: string;
  model?: string;
  width?: number;
  height?: number;
  signal?: AbortSignal;
}): Promise<{ buffer: Buffer; mime: string; model: string; size: string }> {
  const key = openaiApiKey();
  if (!key) {
    throw new OpenAIBoothError(
      "OPENAI_API_KEY is not configured (server secret required).",
      "missing_key",
    );
  }
  if (!opts.imageBytes?.length) {
    throw new OpenAIBoothError(
      "Missing source image bytes for OpenAI edit.",
      "bad_request",
    );
  }

  const model = opts.model?.trim() || resolveOpenAiImageModel();
  const size = resolveOpenAiImageSize({
    width: opts.width,
    height: opts.height,
  });
  const quality = resolveQuality();
  const prompt = (opts.prompt || PHOTO_BOOTH_OPENAI_PROMPT).trim();
  const mimeType = opts.mimeType?.trim() || "image/jpeg";
  const filename = mimeType.includes("png")
    ? "photo.png"
    : mimeType.includes("webp")
      ? "photo.webp"
      : "photo.jpg";

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append(
    "image",
    new Blob([new Uint8Array(opts.imageBytes)], { type: mimeType }),
    filename,
  );
  form.append("quality", quality);
  form.append("size", size);
  form.append("output_format", "jpeg");
  // Face hold only on the gpt-image-1* family (omit for gpt-image-2+).
  if (/gpt-image-1/i.test(model) && !/gpt-image-2/i.test(model)) {
    form.append("input_fidelity", "high");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
      signal: controller.signal,
    });

    const rawText = await res.text();
    let json: EditJson = {};
    try {
      json = JSON.parse(rawText) as EditJson;
    } catch {
      // non-JSON body
    }

    if (!res.ok) {
      const msg =
        json.error?.message ||
        rawText.slice(0, 240) ||
        `OpenAI images/edits failed (${res.status})`;
      if (res.status === 400 || res.status === 422) {
        throw new OpenAIBoothError(msg.slice(0, 280), "bad_request");
      }
      throw new OpenAIBoothError(msg.slice(0, 280), "openai");
    }

    const b64 = json.data?.[0]?.b64_json;
    if (b64) {
      return {
        buffer: Buffer.from(b64, "base64"),
        mime: "image/jpeg",
        model,
        size,
      };
    }

    const url = json.data?.[0]?.url;
    if (url) {
      const imgRes = await fetch(url, { signal: controller.signal });
      if (!imgRes.ok) {
        throw new OpenAIBoothError(
          `Could not download OpenAI result (${imgRes.status})`,
          "bad_response",
        );
      }
      return {
        buffer: Buffer.from(await imgRes.arrayBuffer()),
        mime: imgRes.headers.get("content-type") || "image/jpeg",
        model,
        size,
      };
    }

    throw new OpenAIBoothError(
      "OpenAI images/edits returned no image data.",
      "bad_response",
    );
  } catch (err) {
    if (err instanceof OpenAIBoothError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new OpenAIBoothError(
        "OpenAI image edit timed out.",
        "timeout",
      );
    }
    throw new OpenAIBoothError(
      err instanceof Error ? err.message.slice(0, 280) : "OpenAI generation failed.",
      "openai",
    );
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** Alias matching earlier draft naming. */
export const generateOpenAiEightiesPhoto = generateOpenAIEightiesPhoto;
