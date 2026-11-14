import sharp from "sharp";
import {
  renderPolaroidWatermark,
  renderTornPaperEdge,
} from "./watermark";

const FRAME = {
  /** Inner photo size (square). */
  photo: 900,
  padTop: 48,
  padSide: 48,
  /** Tall bottom border for crown → script → chrome → BIRTHDAY PARTY. */
  padBottom: 380,
};

const PAPER = { r: 250, g: 248, b: 242 };

/** Exported Polaroid pixel size after branding. */
export const POLAROID_SIZE = {
  width: FRAME.photo + FRAME.padSide * 2,
  height: FRAME.photo + FRAME.padTop + FRAME.padBottom,
} as const;

/**
 * Strip EXIF/GPS and normalize to JPEG RGB.
 */
export async function sanitizeImage(input: Buffer): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  mime: "image/jpeg";
}> {
  const image = sharp(input, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const buffer = await image
    .removeAlpha()
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  const out = await sharp(buffer).metadata();
  return {
    buffer,
    width: out.width || meta.width || 0,
    height: out.height || meta.height || 0,
    mime: "image/jpeg",
  };
}

/**
 * Pixel-composite a branded Polaroid:
 * white frame + photo + torn-paper seam + centered party watermark.
 * Watermark is SVG/sharp composite from crown path + chrome-80s.png — not AI text.
 */
export async function composeBrandedPolaroid(photoJpeg: Buffer): Promise<Buffer> {
  const photoSize = FRAME.photo;
  const width = POLAROID_SIZE.width;
  const height = POLAROID_SIZE.height;

  const photo = await sharp(photoJpeg)
    .resize(photoSize, photoSize, { fit: "cover", position: "attention" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const tornH = 38;
  const torn = await sharp(renderTornPaperEdge(photoSize, tornH)).png().toBuffer();
  const tornTop = FRAME.padTop + photoSize - Math.round(tornH * 0.55);
  const tornLeft = FRAME.padSide;

  const markRaw = await renderPolaroidWatermark();
  const markMaxW = Math.round(width * 0.58);
  const markMaxH = FRAME.padBottom - 28;
  const mark = await sharp(markRaw)
    .resize({
      width: markMaxW,
      height: markMaxH,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const markMeta = await sharp(mark).metadata();
  const markW = markMeta.width || markMaxW;
  const markH = markMeta.height || Math.round(markW * 0.45);
  const markLeft = Math.round((width - markW) / 2);
  const borderStart = FRAME.padTop + photoSize;
  const markTop =
    borderStart + Math.max(12, Math.round((FRAME.padBottom - markH) / 2));

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: PAPER,
    },
  })
    .composite([
      { input: photo, top: FRAME.padTop, left: FRAME.padSide },
      { input: torn, top: tornTop, left: tornLeft },
      { input: mark, top: markTop, left: markLeft },
    ])
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer();
}

/**
 * Local mock 80s grade used only when BOOTH_MOCK_AI=1 — still a real pixel pipeline,
 * never reported as AI success in production without the flag.
 */
export async function mockEightiesGrade(input: Buffer): Promise<Buffer> {
  const base = await sharp(input)
    .resize(1024, 1024, { fit: "cover", position: "attention" })
    .modulate({ saturation: 1.45, brightness: 1.05, hue: 12 })
    .tint({ r: 255, g: 80, b: 180 })
    .linear(1.15, -12)
    .sharpen()
    .jpeg({ quality: 90 })
    .toBuffer();

  const neon = Buffer.from(`
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#ff00aa" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.25"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#g)"/>
      <g stroke="#ff4fd8" stroke-width="6" opacity="0.55">
        <line x1="0" y1="820" x2="1024" y2="200"/>
        <line x1="0" y1="900" x2="1024" y2="280"/>
        <line x1="0" y1="980" x2="1024" y2="360"/>
      </g>
    </svg>
  `);

  return sharp(base)
    .composite([{ input: await sharp(neon).png().toBuffer(), blend: "screen" }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
