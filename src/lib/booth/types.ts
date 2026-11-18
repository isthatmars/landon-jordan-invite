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

export const BOOTH_AI_LIMIT = 5;
export const BOOTH_AI_WINDOW_MS = 60 * 60 * 1000;
export const BOOTH_ANON_IP_LIMIT = 8;
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
 * OpenAI / OpenArt / Gemini image edit: authentic late-80s album photo with
 * facial identity lock. Period-correct eyewear when glasses are present;
 * varied real-world 80s wardrobe — not neon costume clichés.
 */
export const EIGHTYS_STYLE_PROMPT = `What would this picture look like if it were taken in the 80's? Retain facial features.

Edit the attached photograph in place (image-to-image). Goal: a believable real late-1980s photo-album snapshot (about 1985–1989 consumer film) — NOT a costume-party neon stereotype, NOT Instagram teal-magenta grading, NOT plastic AI skin.

IDENTITY (highest priority — non-negotiable):
- Keep every person's exact face shape, features, skin tone, facial hair, expression, body type, pose, people count, and framing.
- Do not face-swap, beautify, de-age, re-age, invent people, or change who is in the photo.

EYEWEAR (period-correct when present):
- If someone wears glasses, they must still wear glasses — keep that they wear eyewear.
- Restyle obviously modern frames (clear skinny rectangles, thin translucent plastic, current fashion specs) into authentic late-80s eyewear: larger acetate frames, classic aviators, or other period plastic/metal frames that fit the face.
- Do not leave modern clear skinny rectangular frames unchanged. Do not remove glasses. Do not add glasses if the person is not wearing any.

CLOTHING (varied authentic 1985–89 fashion — flattering, not costume):
- Restyle modern clothes into period-appropriate late-80s fashion that fits each person's vibe, formality, and silhouette (casual stays casual; dressy stays dressy).
- Use varied real-world 80s wardrobes: denim jackets, acid/stonewash jeans, soft knits, polos, oxfords, simple tees, muted color-block jackets, flannel, high-waist trousers, modest gold chain — natural, lived-in color palettes.
- Do NOT default every subject to a neon teal / magenta / electric-blue windbreaker. Avoid cliché “80s costume” neon overload and identical tracksuits on everyone.

BACKGROUND & LIGHT:
- Keep a period-plausible environment from the original context (same place type, camera angle, outdoor/indoor feel). Natural available light or on-camera flash — not a generic neon club / mall booth invented from nowhere.

FILM LOOK:
- Consumer C-41 film: visible grain, mild warm or cool film-stock cast, slight optical softness — like a real handled print, not a phone filter and not an Instagram teal-magenta grade.

OUTPUT:
- One photorealistic edited photograph. No text, logos, watermarks, UI chrome, or Polaroid borders drawn in the image.`;

/** Alias — same master prompt constant. */
export const PHOTO_BOOTH_MASTER_PROMPT = EIGHTYS_STYLE_PROMPT;

/** Negative constraints appended for models without a separate negativePrompt field. */
export const EIGHTYS_NEGATIVE_PROMPT = [
  "face swap",
  "different person",
  "changed identity",
  "removed glasses",
  "modern clear skinny rectangle frames left unchanged",
  "unchanged contemporary translucent eyewear",
  "default neon teal magenta blue windbreaker costume",
  "cliché 80s costume party neon overload",
  "matching neon tracksuits on everyone",
  "Instagram teal-magenta grade",
  "beauty filter",
  "plastic AI skin",
  "airbrushed skin",
  "de-aged",
  "extra people",
  "costume-party 80s art",
  "Miami neon collage",
  "generic neon club backdrop",
  "cartoon",
  "text overlay",
  "watermark",
  "Polaroid frame drawn in image",
].join(", ");

/** Controlled outfit accents — varied real 80s wardrobes; never neon-costume default. */
export const EIGHTYS_OUTFIT_VARIATIONS = [
  "Favor soft knits, denim jacket, or muted earth-tone layers that fit each person's vibe — no neon windbreaker default.",
  "Favor acid/stonewash denim and simple period tees or polos with natural color palettes.",
  "Favor quiet late-80s casual (oxford/polo, high-waist denim, modest chain) — flattering, not costume-party.",
  "Favor period-correct layers with varied real-world colors (navy, cream, olive, washed black) — avoid teal/magenta stereotype.",
] as const;

/** Controlled environment accents — same place vibe, period-true materials. */
export const EIGHTYS_ENVIRONMENT_VARIATIONS = [
  "Keep the same place vibe and camera angle; quiet period-plausible materials only.",
  "Warm available light or on-camera flash that matches the source — album-like, not cinematic neon.",
] as const;

/** Small photo-detail accents for album authenticity (no text overlays). */
export const EIGHTYS_FILM_DETAIL_VARIATIONS = [
  "Emphasize fine film grain and a mild warm C-41 print cast — not teal-magenta grading.",
  "Slight optical softness and mild vignette — consumer film, no text overlays.",
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
