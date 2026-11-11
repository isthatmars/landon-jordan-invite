"use client";

import { useEffect, useState } from "react";
import { youtubeThumbCandidates } from "@/lib/youtube";

/**
 * YouTube poster with maxres → hq → mq fallback.
 * maxresdefault often returns a tiny placeholder instead of 404 when missing.
 */
export function YoutubeThumb({
  videoId,
  alt,
  className,
}: {
  videoId: string;
  alt: string;
  className?: string;
}) {
  const candidates = youtubeThumbCandidates(videoId);
  const [tier, setTier] = useState(0);

  useEffect(() => {
    setTier(0);
  }, [videoId]);

  const src = candidates[Math.min(tier, candidates.length - 1)] || "";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onLoad={(e) => {
        if (tier >= candidates.length - 1) return;
        const { naturalWidth, naturalHeight } = e.currentTarget;
        // Missing maxres often serves a 120×90 gray stub.
        if (naturalWidth > 0 && naturalWidth <= 120 && naturalHeight <= 90) {
          setTier((t) => Math.min(t + 1, candidates.length - 1));
        }
      }}
      onError={() => {
        setTier((t) => Math.min(t + 1, candidates.length - 1));
      }}
    />
  );
}
