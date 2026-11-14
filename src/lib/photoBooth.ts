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
 * Prompt for the 80s Polaroid look. Keep the subject recognizable;
 * restyle wardrobe / grain / flash / era, do not replace the person.
 */
export const PHOTO_BOOTH_TRANSFORM_PROMPT = [
  "Transform this exact person into a vintage 1980s photo booth Polaroid portrait.",
  "Preserve their face, identity, age, and likeness precisely — same person, same features.",
  "1980s mall photo booth aesthetic: soft flash, slight film grain, warm color cast,",
  "mild vignette, authentic Polaroid frame crop feel, nostalgic party energy.",
  "Optional era styling (windbreaker, big hair vibe, neon party mood) without changing who they are.",
  "Photorealistic, not cartoon, not illustration. Single subject, centered head-and-shoulders.",
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
  code?: "missing_token" | "bad_request" | "openart" | "timeout";
};
