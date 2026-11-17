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
 * OpenArt image2image — keep the exact photo, lightly restyle it as a real 1980s
 * snapshot. Prefer identity + scene continuity over a full costume restyle.
 */
export const EIGHTYS_STYLE_PROMPT = `Keep the exact photo but make it look like a real photograph taken in the 1980s.

IDENTITY LOCK (non-negotiable):
- Same person/people, same face(s), facial features, skin tone, age, hairline, facial hair, eye shape, nose, mouth, and expression.
- Same people count, pose, framing, camera angle, and body proportions.
- Do not face-swap, beautify, de-age, re-age, or invent new people.

SCENE CONTINUITY:
- Keep the same background/setting essence from the upload (driveway stays a driveway; car stays a period-plausible car; living room stays a living room).
- Translate materials/lighting/props into period-correct 1980s versions of THAT place — do not invent an unrelated Miami Vice neon club, beach, or mall booth if it is not in the source.

WARDROBE:
- Keep the same outfit silhouette and layering; only shift fabrics/colors/details to the closest era-appropriate 1980s version of what they are already wearing.
- Do not force windbreakers, leather jackets, or party costumes unless the source clothing already reads that way.

LOOK:
- Natural, period-correct 1980s consumer photo: warm flash or available light, slight film grain, mild color cast, natural skin texture, mild vignette.
- Photorealistic snapshot — not illustration, not CGI, not cartoon.
- Single photograph ready for a Polaroid frame (keep framing; do not invent borders). No text, logos, watermarks, UI, or drawn frames.`;

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
  "invented Miami neon club",
  "unrelated nightclub",
  "forced windbreaker costume",
  "cartoon",
  "anime",
  "illustration",
  "3d render",
  "CGI",
  "watermark",
  "logo",
  "text overlay",
  "UI chrome",
  "Polaroid frame drawn in image",
].join(", ");

/** Combined prompt sent to OpenArt generate. */
export function buildEightysOpenArtPrompt(): string {
  return `${EIGHTYS_STYLE_PROMPT}

Avoid / do not generate: ${EIGHTYS_NEGATIVE_PROMPT}.`;
}
