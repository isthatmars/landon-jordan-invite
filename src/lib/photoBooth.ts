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
 * Fallback prompt only — prefer `buildEightysOpenArtPrompt` /
 * `PHOTO_BOOTH_MASTER_PROMPT` from `src/lib/booth/types.ts` (source of truth).
 */
export const PHOTO_BOOTH_TRANSFORM_PROMPT = [
  "What would this picture look like if it were taken in the 80's? Retain facial features.",
  "Edit the attached photograph in place. Keep exact faces, skin tone, expression, people count, pose, and scene vibe.",
  "If anyone wears glasses, keep that they wear glasses but restyle modern clear skinny frames into authentic late-80s eyewear (larger acetate, classic aviators, or period plastic frames).",
  "Clothing: flattering varied 1985–89 fashion that fits each person's vibe — not a default neon teal/magenta windbreaker costume.",
  "Believable late-1980s consumer film album photo: grain, mild warm/cool film stock, natural light — not Instagram teal-magenta or costume-party neon AI art.",
  "No text, logos, watermarks, or Polaroid borders. Return one photorealistic edited photograph.",
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
  code?:
    | "missing_token"
    | "bad_request"
    | "openai"
    | "openart"
    | "gemini"
    | "timeout";
};
