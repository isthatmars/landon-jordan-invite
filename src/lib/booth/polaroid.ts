import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const FRAME = {
  /** Inner photo size (square). */
  photo: 900,
  padTop: 48,
  padSide: 48,
  padBottom: 220,
};

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

async function loadLogo(): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "public", "images", "chrome-80s.png");
  return fs.readFile(logoPath);
}

/**
 * Pixel-composite a branded Polaroid: white frame + photo + party logo bottom-right.
 * Logo is the existing chrome 80s mark — not AI-drawn, not a CSS overlay.
 */
export async function composeBrandedPolaroid(photoJpeg: Buffer): Promise<Buffer> {
  const photoSize = FRAME.photo;
  const width = photoSize + FRAME.padSide * 2;
  const height = photoSize + FRAME.padTop + FRAME.padBottom;

  const photo = await sharp(photoJpeg)
    .resize(photoSize, photoSize, { fit: "cover", position: "attention" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const logoRaw = await loadLogo();
  const logoW = Math.round(width * 0.28);
  const logo = await sharp(logoRaw)
    .resize({ width: logoW, withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const logoH = logoMeta.height || Math.round(logoW * 0.55);

  const scriptSvg = Buffer.from(`
    <svg width="${Math.round(width * 0.42)}" height="44" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="32" font-family="Georgia, 'Times New Roman', serif" font-size="28"
        font-style="italic" fill="#e91e8c">Landon &amp; Jordan's</text>
    </svg>
  `);
  const birthdaySvg = Buffer.from(`
    <svg width="${Math.round(width * 0.42)}" height="28" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="20" font-family="Arial, Helvetica, sans-serif" font-size="16"
        font-weight="700" letter-spacing="2" fill="#111">BIRTHDAY PARTY</text>
    </svg>
  `);

  const brandLeft = FRAME.padSide;
  const brandBottomY = height - FRAME.padBottom + 36;
  const logoLeft = width - FRAME.padSide - logoW;
  const logoTop = height - FRAME.padBottom + Math.max(16, Math.round((FRAME.padBottom - logoH) / 2) - 8);

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 250, g: 248, b: 242 },
    },
  })
    .composite([
      { input: photo, top: FRAME.padTop, left: FRAME.padSide },
      { input: scriptSvg, top: brandBottomY, left: brandLeft },
      { input: birthdaySvg, top: brandBottomY + 40, left: brandLeft },
      { input: logo, top: logoTop, left: logoLeft },
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
