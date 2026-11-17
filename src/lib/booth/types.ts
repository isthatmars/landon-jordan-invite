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
 * Gemini / OpenArt image2image — restyle the upload as an authentic late-1980s
 * throwback photo ("what would this look like if taken in the 80s"), while
 * locking faces, people count, pose, and composition identity.
 */
export const EIGHTYS_STYLE_PROMPT = `Transform this exact photograph into an authentic late-1980s throwback snapshot — as if it were really taken around 1987–1989 with a consumer film camera. Restyle the ERA (fashion, hair, cars, film look); do not invent new people or a new scene.

IDENTITY LOCK (non-negotiable):
- Same person/people, same face(s), facial features, skin tone, age, hairline, facial hair, eye shape, nose, mouth, and expression.
- Same people count, pose, body language, framing, camera angle, crop, and composition identity.
- Do not face-swap, beautify, smooth skin, de-age, re-age, or invent / remove people.

ERA RESTYLE (be bold — modern uploads should clearly read as 1980s):
- Wardrobe: restyle clothing into period-accurate late-80s fashion that fits THIS scene (e.g. geometric nylon windbreakers, acid-wash / stonewash denim, puff shoulders, bold patterned knits, chunky sneakers, gold chains, oversized frames / aviators, digital watches). Keep similar color family and formality when possible, but do NOT leave modern athleisure, slim contemporary cuts, or current logos looking modern.
- Hair: period-plausible 80s volume / styling when it fits the subject (teased / permed curls, high volume, clean fades) without changing identity.
- Setting: keep the same place type (street, canyon overlook, driveway, living room, etc.) but period-correct props — late-70s/80s cars instead of modern vehicles, era-plausible signage and details. Do not invent an unrelated Miami Vice neon club, mall booth, or beach if it is not in the source.

ANALOG FILM LOOK (required — this must not look like a clean modern digital photo):
- Warm aged film color grade (slight yellow/orange cast, soft saturation).
- Visible film grain across the image; soft focus / slight softness (not clinical digital sharpness).
- Mild vignette; natural skin texture (no beauty filter).
- Subtle aged photo wear: light scuffs, dust specks, and edge wear as on a handled print.

OPTIONAL DATE STAMP:
- You may add one small classic orange/red segmented LCD date stamp in a corner (e.g. JUN 27 1988). No other text.

OUTPUT:
- Photorealistic single photograph — not illustration, cartoon, CGI, or collage.
- Keep the same framing; do not draw Polaroid borders, UI chrome, stickers, or watermarks.
- No logos, brand names, event titles, or "Landon & Jordan" branding anywhere in the image.`;

/** Negative constraints appended for models without a separate negativePrompt field. */
export const EIGHTYS_NEGATIVE_PROMPT = [
  "face swap",
  "different person",
  "changed identity",
  "beauty filter",
  "airbrushed skin",
  "plastic skin",
  "de-aged",
  "re-aged",
  "extra people",
  "missing people",
  "changed pose",
  "modern digital look",
  "HDR smartphone photo",
  "clinically sharp",
  "unchanged modern clothing",
  "modern car left modern",
  "invented Miami neon club",
  "unrelated nightclub",
  "cartoon",
  "anime",
  "illustration",
  "3d render",
  "CGI",
  "watermark",
  "logo",
  "brand name",
  "Landon & Jordan text",
  "event title overlay",
  "UI chrome",
  "Polaroid frame drawn in image",
].join(", ");

/** Combined prompt sent to Gemini / OpenArt generate. */
export function buildEightysOpenArtPrompt(): string {
  return `${EIGHTYS_STYLE_PROMPT}

Avoid / do not generate: ${EIGHTYS_NEGATIVE_PROMPT}.`;
}
