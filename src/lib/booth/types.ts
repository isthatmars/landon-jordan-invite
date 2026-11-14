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

/** OpenArt image2image prompt — identity lock + 80s Polaroid look. */
export const EIGHTYS_STYLE_PROMPT = `Transform this exact person into a vintage 1980s photo booth Polaroid portrait for Landon & Jordan's birthday.

Preserve identity exactly: same face(s), skin tone, age cues, hairline, facial hair, glasses shape if present, body type, and number of people. Do not add or remove people. Keep natural features — no beauty filters, no face swap, no age change.

Style (one cohesive look):
- Authentic late-80s fashion: colorful windbreakers / track jackets, bold color blocks (teal, magenta, purple, red), gold-rim aviators or clear oversized frames when glasses already exist
- Lighting: warm flash + neon pink and electric blue rim light, soft haze
- Photographic feel: Polaroid / party flash photo, slight film grain, natural skin texture, mild vignette
- Keep the subject centered head-and-shoulders; photorealistic, not cartoon

Output a single square portrait photograph ready for a Polaroid frame. No text, logos, watermarks, UI, or borders in the image.`;
