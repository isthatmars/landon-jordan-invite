/**
 * Gemini image edit for Photo Booth (identity-preserving 80s restyle).
 *
 * Uses Google Generative Language REST API with GEMINI_API_KEY or
 * GOOGLE_GENERATIVE_AI_API_KEY — no extra SDK required. Prefer this path
 * when a Gemini key is set (see booth/ai.ts).
 */

export const PHOTO_BOOTH_GEMINI_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiError extends Error {
  code: "missing_key" | "bad_request" | "gemini" | "timeout";
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

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

type GeminiResponse = {
  error?: { message?: string; status?: string; code?: number };
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
};

function extractImage(parts: GeminiPart[] | undefined): {
  buffer: Buffer;
  mime: string;
} | null {
  if (!parts?.length) return null;
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    const data = inline?.data;
    if (!data) continue;
    const mime =
      part.inlineData?.mimeType ||
      part.inline_data?.mime_type ||
      "image/png";
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
  const url = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
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
        generationConfig: {
          // Image-only keeps latency down for the Polaroid flow.
          responseModalities: ["IMAGE"],
        },
      }),
      signal: controller.signal,
    });

    const json = (await res.json().catch(() => ({}))) as GeminiResponse;

    if (!res.ok) {
      const msg =
        json.error?.message ||
        `Gemini request failed (${res.status})`;
      if (res.status === 400) {
        throw new GeminiError(msg.slice(0, 220), "bad_request");
      }
      throw new GeminiError(msg.slice(0, 220), "gemini");
    }

    const parts = json.candidates?.[0]?.content?.parts;
    const image = extractImage(parts);
    if (!image) {
      const reason = json.candidates?.[0]?.finishReason;
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
    throw new GeminiError(
      err instanceof Error ? err.message : "Gemini generation failed.",
      "gemini",
    );
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}
