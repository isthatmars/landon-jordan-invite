export type BoothPhotoKind = "ai" | "throwback";

export type BoothPhotoStatus =
  | "private"
  | "pending"
  | "approved"
  | "rejected"
  | "failed";

export type BoothGenerationStatus = "queued" | "running" | "ready" | "failed";

export interface BoothGuest {
  email: string;
  firstName: string;
  rsvpId: string | null;
  attend: string | null;
  hasRsvp: boolean;
}

export interface BoothSessionRecord {
  id: string;
  tokenHash: string;
  email: string;
  firstName: string;
  rsvpId: string | null;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface BoothPhotoRecord {
  id: string;
  kind: BoothPhotoKind;
  guestEmail: string;
  guestFirstName: string;
  rsvpId: string | null;
  status: BoothPhotoStatus;
  consentAt: string | null;
  sourcePath: string | null;
  rawPath: string | null;
  brandedPath: string | null;
  mime: string;
  width: number | null;
  height: number | null;
  errorMessage: string | null;
  submittedToGalleryAt: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
  generationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoothGenerationRecord {
  id: string;
  photoId: string | null;
  guestEmail: string;
  rsvpId: string | null;
  ipHash: string | null;
  status: BoothGenerationStatus;
  model: string | null;
  prompt: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface BoothTempUpload {
  id: string;
  guestEmail: string | null;
  sessionId: string | null;
  path: string;
  mime: string;
  bytes: number;
  purpose: "ai_source" | "throwback";
  expiresAt: string;
  deletedAt: string | null;
  createdAt: string;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: string | null;
  allowed: boolean;
}

/** Max AI generations per guest email per rolling hour (verified sessions). */
export const BOOTH_AI_LIMIT = 5;
export const BOOTH_AI_WINDOW_MS = 60 * 60 * 1000;
/** Max AI generations per hashed client IP per rolling hour (anonymous + verified). */
export const BOOTH_ANON_IP_LIMIT = 5;
export const BOOTH_TEMP_TTL_MS = 30 * 60 * 1000;
export const BOOTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const BOOTH_OTP_TTL_MS = 15 * 60 * 1000;
export const BOOTH_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const BOOTH_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * Master Photo Booth transform prompt (source of truth).
 * OpenAI / OpenArt / Gemini image edit: simple 80s restyle with identity lock.
 * Core guest wording kept first; minimal locks appended.
 */
export const EIGHTYS_STYLE_PROMPT = `What would this picture look like if it were taken in the 80's? Retain facial features.

Edit the attached photograph in place (image-to-image). Keep every person's exact face, skin tone, expression, body type, pose, people count, and eyewear (same glasses if present). Do not face-swap, de-age, or invent people.

Make it feel like a real late-1980s / early-1990s consumer film snapshot: warm C-41 color, visible grain, slight softness — not costume-party neon AI art, not a modern phone filter. Keep the same scene vibe and framing. No text, logos, watermarks, or Polaroid borders in the image. Return one photorealistic edited photograph.`;

/** Alias — same master prompt constant. */
export const PHOTO_BOOTH_MASTER_PROMPT = EIGHTYS_STYLE_PROMPT;

/** Negative constraints appended for models without a separate negativePrompt field. */
export const EIGHTYS_NEGATIVE_PROMPT = [
  "face swap",
  "different person",
  "changed identity",
  "removed glasses",
  "beauty filter",
  "de-aged",
  "extra people",
  "costume-party 80s art",
  "Miami neon collage",
  "cartoon",
  "text overlay",
  "watermark",
  "Polaroid frame drawn in image",
].join(", ");

/** Controlled outfit accents — light period nudges only; never clone looks. */
export const EIGHTYS_OUTFIT_VARIATIONS = [
  "Quiet late-80s wardrobe color/fabric nudges; keep each outfit distinct.",
  "Subtle period palette shifts only — no matching tracksuits.",
] as const;

/** Controlled environment accents — same place vibe, period-true materials. */
export const EIGHTYS_ENVIRONMENT_VARIATIONS = [
  "Keep the same place vibe and camera angle; quiet period cues only.",
  "Warm available light or on-camera flash that matches the source.",
] as const;

/** Small photo-detail accents for album authenticity (no text overlays). */
export const EIGHTYS_FILM_DETAIL_VARIATIONS = [
  "Emphasize fine film grain and a soft warm print cast.",
  "Slight optical softness and mild vignette — no text overlays.",
] as const;

function pickVariation<T extends readonly string[]>(
  options: T,
  seed: number,
  salt: number,
): T[number] {
  const idx = Math.abs((seed * 31 + salt) | 0) % options.length;
  return options[idx]!;
}

export type EightysPromptOptions = {
  /** Stable-ish seed for controlled outfit/environment/film variation. */
  variationSeed?: number;
};

/**
 * Combined master prompt sent to OpenAI / OpenArt / Gemini generate.
 * Optional variationSeed rotates outfit/environment/film accents without
 * changing the identity lock or overall aesthetic.
 */
export function buildEightysOpenArtPrompt(opts?: EightysPromptOptions): string {
  const seed =
    typeof opts?.variationSeed === "number" && Number.isFinite(opts.variationSeed)
      ? Math.floor(opts.variationSeed)
      : Date.now();

  const outfit = pickVariation(EIGHTYS_OUTFIT_VARIATIONS, seed, 7);
  const environment = pickVariation(EIGHTYS_ENVIRONMENT_VARIATIONS, seed, 13);
  const film = pickVariation(EIGHTYS_FILM_DETAIL_VARIATIONS, seed, 19);

  return `${EIGHTYS_STYLE_PROMPT}

CONTROLLED VARIATION (keep identity + film quality constant):
- Outfit accent: ${outfit}
- Environment accent: ${environment}
- Film detail accent: ${film}

Avoid / do not generate: ${EIGHTYS_NEGATIVE_PROMPT}.`;
}

/** Alias for callers that prefer the “master prompt” name. */
export function buildPhotoBoothMasterPrompt(
  opts?: EightysPromptOptions,
): string {
  return buildEightysOpenArtPrompt(opts);
}
