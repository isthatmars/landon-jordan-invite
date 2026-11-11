/** Prefer maxres, then hq, then mq — some videos lack maxresdefault. */
export const YOUTUBE_THUMB_TIERS = ["maxresdefault", "hqdefault", "mqdefault"] as const;

export type YoutubeThumbTier = (typeof YOUTUBE_THUMB_TIERS)[number];

const ID_RE = /^[\w-]{11}$/;

/**
 * Pull an 11-char YouTube id from a watch/embed/shorts/youtu.be URL, or pass through a bare id.
 */
export function extractYoutubeId(input: string | null | undefined): string {
  if (!input) return "";
  const raw = input.trim();
  if (!raw) return "";
  if (ID_RE.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return ID_RE.test(id) ? id : "";
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      const kind = parts[0];
      if (
        (kind === "embed" || kind === "shorts" || kind === "live" || kind === "v") &&
        parts[1] &&
        ID_RE.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    const fromQuery = raw.match(/[?&]v=([\w-]{11})/);
    if (fromQuery) return fromQuery[1];
    const fromPath = raw.match(/(?:youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    if (fromPath) return fromPath[1];
  }

  return "";
}

export function youtubeThumbUrl(id: string, tier: YoutubeThumbTier = "maxresdefault"): string {
  return `https://i.ytimg.com/vi/${id}/${tier}.jpg`;
}

/** Preferred poster for storage / SSR — clients may still fall back on load error. */
export function youtubePosterUrl(id: string): string {
  return youtubeThumbUrl(id, "maxresdefault");
}

export function youtubeThumbCandidates(id: string): string[] {
  return YOUTUBE_THUMB_TIERS.map((tier) => youtubeThumbUrl(id, tier));
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
