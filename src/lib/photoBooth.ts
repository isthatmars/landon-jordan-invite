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
 * Keep the exact photo; lightly make it a natural 1980s snapshot.
 */
export const PHOTO_BOOTH_TRANSFORM_PROMPT = [
  "Keep the exact photo but make it look like a real photograph taken in the 1980s.",
  "Preserve face, identity, people count, pose, framing, and facial features exactly.",
  "Keep the same background/setting essence from the upload; only period-correct that place.",
  "Shift clothing only to the closest era-appropriate version of what they already wear.",
  "Natural 1980s consumer photo: warm flash or available light, slight film grain, mild color cast, natural skin.",
  "Photorealistic snapshot, not cartoon or illustration. No text, logos, watermarks, or borders.",
  "Avoid: face swap, beauty filter, extra people, invented Miami neon club, forced costume restyle, CGI.",
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
