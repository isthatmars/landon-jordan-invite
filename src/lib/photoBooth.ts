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
  "EDIT THIS PHOTOGRAPH (image-to-image). The attached image is the only visual source of truth — edit it in place; do not invent people from a text description.",
  "Reinterpret it as a true-to-life late-1980s / early-1990s consumer film snapshot — not costume-party 80s AI art, not matching tracksuits, not a Miami neon collage, not a modern digital photo with a retro filter.",
  "IDENTITY LOCK: preserve exact faces, body types, proportions, skin tone, hair, facial hair, expressions, people count, poses, scene vibe, and camera perspective.",
  "EYEWEAR LOCK: if anyone wears glasses, keep the SAME glasses (shape, color, placement). Do not remove or replace glasses (no clear frames → gold aviators).",
  "Keep distinct outfits per person; light era-appropriate color/wardrobe shifts OK. Do not force matching tracksuits, identical windbreakers, matching hairstyles, or a wheelchair not in the source.",
  "Background should feel like the same place in that era (or a period-true equivalent) — not a costume-party swap or generic neon backdrop.",
  "Required film look: C-41 warm yellow-orange cast, visible grain, slight softness, natural light or on-camera flash, mild vignette, subtle print wear. No text overlays.",
  "Photorealistic single cohesive documentary photograph. No beauty filter, plastic skin, cartoon, CGI, logos, watermarks, Polaroid borders, text overlays, or Landon & Jordan branding.",
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
