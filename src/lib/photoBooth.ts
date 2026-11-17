/** Photo Booth flow types. Scene chrome is fixed — only panel content changes. */

export const PHOTO_BOOTH_STEPS = [
  "welcome",
  "capture",
  "generating",
  "reveal",
] as const;

export type PhotoBoothStep = (typeof PHOTO_BOOTH_STEPS)[number];

/** OpenArt model id for identity-preserving 80s transforms (image2image). */
export const PHOTO_BOOTH_OPENART_MODEL =
  process.env.OPENART_IMAGE_MODEL?.trim() || "nano-banana-2";

export const PHOTO_BOOTH_OPENART_MODE = "image2image" as const;

/**
 * Fallback prompt (prefer `buildEightysOpenArtPrompt` from booth/types).
 * Authentic late-80s throwback restyle while locking identity + composition.
 */
export const PHOTO_BOOTH_TRANSFORM_PROMPT = [
  "Transform this exact photo into an authentic late-1980s throwback snapshot — as if taken ~1987–1989 on consumer film.",
  "Preserve face, identity, people count, pose, framing, and facial features exactly; do not invent or remove people.",
  "Restyle era boldly: period-accurate late-80s fashion/hair/accessories that fit the scene; period-correct cars and setting details.",
  "Keep the same place type from the upload; do not invent an unrelated neon club or mall booth.",
  "Required film look: warm aged color grade, visible grain, soft focus, mild vignette, subtle edge wear/scuffs/dust.",
  "Optional: one small classic orange/red LCD date stamp in a corner (e.g. JUN 27 1988). No other text.",
  "Photorealistic snapshot, not cartoon/CGI. No logos, watermarks, Polaroid borders, UI, or Landon & Jordan branding.",
  "Avoid: face swap, beauty filter, modern digital look, unchanged modern clothes/cars, extra people, invented Miami neon club.",
].join(" ");

export type PhotoBoothGenerateRequest = {
  /** Data URL or raw base64 of the guest capture (jpeg/png/webp). */
  imageBase64: string;
  mimeType?: string;
};

export type PhotoBoothGenerateResponse = {
  ok: true;
  historyId: string;
  imageUrl: string;
  model: string;
  mode: typeof PHOTO_BOOTH_OPENART_MODE;
};

export type PhotoBoothGenerateError = {
  ok: false;
  error: string;
  code?: "missing_token" | "bad_request" | "openart" | "gemini" | "timeout";
};
