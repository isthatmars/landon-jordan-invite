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
 * Gemini / OpenArt image2image: reinterpret the uploaded photo as a
 * late-80s / early-90s true-to-life film snapshot while locking identity.
 */
export const EIGHTYS_STYLE_PROMPT = `EDIT THIS PHOTOGRAPH (image-to-image). The attached image is the only visual source of truth — edit it in place. Do not invent people from a text description. Do not regenerate a new scene from imagination. Output one photorealistic edited photograph.

Goal: reinterpret this photo as a true-to-life late-1980s / early-1990s consumer film snapshot (documentary family-album look) — NOT costume-party 80s AI art, NOT matching tracksuits, NOT a Miami neon collage, NOT a modern digital photo with a retro filter.

IDENTITY LOCK (highest priority — non-negotiable):
- Preserve every person's exact face, facial structure, proportions, skin tone, age appearance, hairline, hairstyle silhouette, facial hair shape/density, eye shape, nose, mouth, expression, body type, and pose.
- Eyewear lock: if anyone wears glasses, keep the SAME glasses — same frame shape, thickness, color/material, lens size, and placement on the face. Do not remove glasses. Do not replace clear/translucent/plastic frames with gold aviators or invent different eyewear. If they do not wear glasses, do not add glasses.
- Keep the same people count, approximate positions, body proportions, poses, expressions, scene vibe, and camera perspective / framing / crop identity.
- Do not force matching or synchronized hairstyles across people.
- Do not add or invent a wheelchair (or other assistive devices that are not in the source).
- No face-swap, beauty filter, plastic/airbrushed skin, smooth-skin AI finish, de-aging, re-aging, cartoon features, or altered recognizable features.

ERA REINTERPRETATION (period-true, not a costume swap):
- Clothing: keep each person's distinct outfit identity and silhouette family. Light era-appropriate color or wardrobe shifts are OK (fabric, cut, or palette nudges that quietly read late-80s / early-90s). Do NOT costume-swap into matching tracksuits, identical windbreakers, or one cloned look for everyone. Distinct outfits per person.
- Environment: keep the same place / scene vibe — this location in that era, or a period-true equivalent of the same place type. Respect original camera perspective, framing, lighting direction, and outdoor/indoor context. Do NOT invent a costume-party backdrop, generic neon club, mall photo-booth, or Miami Vice collage unrelated to the photo's context.
- Hair: only period-plausible volume or styling that does not change identity; never force the same hairstyle on everyone.

CONSUMER FILM LOOK (required — real analog photo, not a filter):
- C-41 consumer color film (Kodak Gold / Kodacolor era): warm slightly faded yellow-orange cast, soft saturation, lifted warm shadows.
- Visible fine-to-medium film grain across the whole image; slight optical softness (not clinical digital sharpness, not HDR smartphone look).
- Natural available light or on-camera flash quality (hard flash and hard shadows are OK when they fit the scene) — not cinematic graded lighting, not beauty-retouched skin.
- Mild vignette; subtle handled-print wear (light dust, faint scuffs, soft edge wear).
- No text overlays of any kind (no date stamps, captions, logos, watermarks, stickers, or titles).

COHESION:
- One cohesive photograph: people, clothing, lighting, background, grain, and color processing must belong together as a single documentary snapshot.

OUTPUT:
- Return a photorealistic IMAGE — not a text description, illustration, cartoon, CGI, collage, or sticker sheet.
- No logos, brand names, watermarks, UI chrome, stickers, drawn Polaroid borders, text overlays, or "Landon & Jordan" branding.`;

/** Alias — same master prompt constant. */
export const PHOTO_BOOTH_MASTER_PROMPT = EIGHTYS_STYLE_PROMPT;

/** Negative constraints appended for models without a separate negativePrompt field. */
export const EIGHTYS_NEGATIVE_PROMPT = [
  "face swap",
  "different person",
  "changed identity",
  "removed glasses",
  "different glasses",
  "replaced eyewear",
  "gold aviators when source has clear frames",
  "beauty filter",
  "airbrushed skin",
  "plastic skin",
  "smooth AI skin",
  "de-aged",
  "re-aged",
  "extra people",
  "missing people",
  "changed pose",
  "changed body type",
  "matching tracksuits",
  "identical outfits",
  "cloned windbreakers",
  "forced matching hairstyles",
  "wheelchair not in source",
  "costume party swap",
  "costume-party 80s art",
  "modern digital look",
  "HDR smartphone photo",
  "clinically sharp",
  "generic neon backdrop",
  "Miami neon collage",
  "invented Miami neon club",
  "unrelated nightclub",
  "mall photo booth backdrop",
  "cartoon",
  "anime",
  "illustration",
  "3d render",
  "CGI",
  "overly cinematic lighting",
  "exaggerated costume",
  "text overlay",
  "date stamp",
  "caption text",
  "watermark",
  "logo",
  "brand name",
  "Landon & Jordan text",
  "event title overlay",
  "UI chrome",
  "Polaroid frame drawn in image",
].join(", ");

/** Controlled outfit accents — light period nudges only; never clone looks. */
export const EIGHTYS_OUTFIT_VARIATIONS = [
  "Allow only light, person-specific color or fabric nudges; keep each outfit distinct.",
  "Keep each person's silhouette family; favor subtle late-80s / early-90s palette shifts over costume pieces.",
  "Quiet period wardrobe cues only (cut, fabric, palette) — never matching tracksuits or identical jackets.",
  "Preserve real-moment outfit identity per person; avoid costume-party restyles.",
] as const;

/** Controlled environment accents — same place vibe, period-true materials. */
export const EIGHTYS_ENVIRONMENT_VARIATIONS = [
  "Keep the same place type and camera angle; period-correct materials, signage, or props only as quiet era cues.",
  "Lean into warm golden-hour / late-afternoon consumer snapshot light that matches the source lighting direction.",
  "Lean into available-light or on-camera flash consistent with the source context (hard flash OK when it fits).",
  "Keep environmental storytelling quiet and album-like — lived-in period details of this place, not a stylized movie set.",
] as const;

/** Small photo-detail accents for album authenticity (no text overlays). */
export const EIGHTYS_FILM_DETAIL_VARIATIONS = [
  "Emphasize fine Kodak Gold-style grain and a soft yellow-orange print cast.",
  "Emphasize mild print edge wear, tiny dust flecks, and a slightly soft consumer lens.",
  "Lean into on-camera flash snap energy with hard shadows when the scene supports it; no text overlays.",
  "Rely on grain, warm C-41 color, and soft focus for the era read — no date stamp or other text.",
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
 * Combined master prompt sent to Gemini / OpenArt generate.
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
