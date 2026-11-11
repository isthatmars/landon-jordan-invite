import type { PlateId } from "@/lib/activePlate";

/** Heavy media per sticky plate — warmed for the active plate ± neighbors. */
export const PLATE_ASSETS: Record<PlateId, readonly string[]> = {
  home: [
    "/images/hero-bg-miami.jpg",
    "/images/hero-couple-cutout-cartoon.png",
    "/images/chrome-80s.png",
  ],
  mixtape: [
    "/images/scene-mixtape-plate.jpg",
    "/images/prop-boombox-scene.png",
    "/images/prop-boombox-reflection.png",
    "/images/prop-headphones-80s.png",
    "/images/cassette-stack-cut.png",
  ],
  watch: [
    "/images/scene-watch-lounge.jpg",
    "/images/prop-crt-front.png",
    "/images/prop-tv-remote.png",
  ],
  arcade: [
    "/images/scene-arcade-room.jpg",
    "/images/scene-arcade-disco.mp4",
    "/images/prop-arcade-bartop.png",
    "/images/prop-skate-pair.png",
  ],
  lineup: [],
  rsvp: ["/images/prop-rsvp-phone.png"],
};

const warmed = new Set<string>();

/** Decode/fetch plate media once so neighbor enter doesn't hitch on first paint. */
export function warmPlateAssets(id: PlateId) {
  if (typeof window === "undefined") return;
  for (const src of PLATE_ASSETS[id]) {
    if (warmed.has(src)) continue;
    warmed.add(src);
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(src)) {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = src;
      // Kick the network without attaching to the DOM.
      void video.load();
      continue;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    if (typeof img.decode === "function") {
      void img.decode().catch(() => {
        /* decode can reject on abort; cache still helps */
      });
    }
  }
}
