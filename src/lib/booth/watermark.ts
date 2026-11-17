import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

/** Pixel size of the reusable Polaroid bottom watermark PNG. */
export const WATERMARK_SIZE = { width: 720, height: 340 } as const;

const CROWN_PATH = "M8 38 14 16l16 12L36 6l6 22 16-12 6 22H8z";
const SCRIPT_TEXT = "Landon & Jordan's";

let fontsReady: Promise<void> | null = null;
let cachedChrome: Buffer | null = null;
let cachedMark: Buffer | null = null;

/**
 * librsvg/sharp resolve fonts through fontconfig — point it at src/fonts
 * so Hastron loads for the purple script line.
 */
async function ensureBoothFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      const fontsDir = path.join(process.cwd(), "src", "fonts");
      const confDir = path.join(process.cwd(), ".cache", "booth-fonts");
      const confPath = path.join(confDir, "fonts.conf");
      await fs.mkdir(confDir, { recursive: true });
      const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>${path.join(confDir, "cache")}</cachedir>
</fontconfig>
`;
      await fs.writeFile(confPath, conf, "utf8");
      process.env.FONTCONFIG_FILE = confPath;
    })();
  }
  await fontsReady;
}

async function loadChrome80s(): Promise<Buffer> {
  if (cachedChrome) return cachedChrome;
  const logoPath = path.join(process.cwd(), "public", "images", "chrome-80s.png");
  cachedChrome = await fs.readFile(logoPath);
  return cachedChrome;
}

/** Point on a quadratic Bézier (for the slight script arch). */
function quadPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function quadTangent(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) {
  const tx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const ty = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(ty, tx) * 180) / Math.PI;
}

/**
 * Arched purple cursive via per-glyph placement (librsvg textPath is unreliable).
 */
function buildArchedScriptSvg(width: number, height: number): Buffer {
  const fontSize = Math.round(height * 0.62);
  const chars = [...SCRIPT_TEXT];
  const advances: Record<string, number> = {
    L: 0.62,
    a: 0.48,
    n: 0.5,
    d: 0.52,
    o: 0.5,
    " ": 0.28,
    "&": 0.55,
    J: 0.58,
    r: 0.36,
    "'": 0.22,
    s: 0.4,
  };
  const gaps = chars.map((ch) => (advances[ch] ?? 0.45) * fontSize);
  const total = gaps.reduce((a, b) => a + b, 0);
  const scale = Math.min(1, (width * 0.92) / total);
  const scaledGaps = gaps.map((g) => g * scale);
  const scaledTotal = scaledGaps.reduce((a, b) => a + b, 0);
  const startX = (width - scaledTotal) / 2;
  const p0 = { x: startX, y: height * 0.78 };
  const p1 = { x: width / 2, y: height * 0.28 };
  const p2 = { x: startX + scaledTotal, y: height * 0.78 };

  let walked = 0;
  const nodes: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const adv = scaledGaps[i];
    const t = scaledTotal === 0 ? 0 : (walked + adv / 2) / scaledTotal;
    const pt = quadPoint(t, p0, p1, p2);
    const angle = quadTangent(t, p0, p1, p2);
    const safe = ch === "&" ? "&amp;" : ch === "'" ? "&apos;" : ch;
    nodes.push(
      `<text x="${pt.x.toFixed(2)}" y="${pt.y.toFixed(2)}" text-anchor="middle"
        transform="rotate(${angle.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)})"
        font-family="Hastron" font-size="${(fontSize * scale).toFixed(2)}"
        fill="#5c2a7a">${safe}</text>`,
    );
    walked += adv;
  }

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${nodes.join("\n")}
    </svg>
  `);
}

/**
 * Programmatic Polaroid border mark:
 * gold crown → purple arched "Landon & Jordan's" → chrome 80s PNG → BIRTHDAY PARTY.
 * Uses existing crown path + chrome-80s.png — no AI-drawn logo text.
 */
export async function renderPolaroidWatermark(
  width = WATERMARK_SIZE.width,
  height = WATERMARK_SIZE.height,
): Promise<Buffer> {
  await ensureBoothFonts();

  if (cachedMark && width === WATERMARK_SIZE.width && height === WATERMARK_SIZE.height) {
    return cachedMark;
  }

  const chromeRaw = await loadChrome80s();

  const chromeW = Math.round(width * 0.66);
  const chrome = await sharp(chromeRaw)
    .trim({ threshold: 8 })
    .resize({ width: chromeW, withoutEnlargement: true })
    .png()
    .toBuffer();
  const chromeMeta = await sharp(chrome).metadata();
  const chromeH = chromeMeta.height || Math.round(chromeW * 0.55);

  const crownW = Math.round(width * 0.1);
  const crownH = Math.round(crownW * (48 / 72));
  const crownSvg = Buffer.from(`
    <svg width="${crownW}" height="${crownH}" viewBox="0 0 72 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffe9a0"/>
          <stop offset="55%" stop-color="#ffd45a"/>
          <stop offset="100%" stop-color="#e0a020"/>
        </linearGradient>
      </defs>
      <path fill="url(#gold)" d="${CROWN_PATH}"/>
      <path fill="#ffe9a0" d="M10 36h52v6H10z"/>
      <circle cx="36" cy="10" r="2.2" fill="#fff4c4"/>
      <circle cx="14" cy="16" r="1.6" fill="#fff4c4"/>
      <circle cx="58" cy="16" r="1.6" fill="#fff4c4"/>
    </svg>
  `);

  const scriptW = Math.round(width * 0.96);
  const scriptH = Math.round(height * 0.2);
  const scriptSvg = buildArchedScriptSvg(scriptW, scriptH);

  const partyW = Math.round(width * 0.82);
  const partyH = Math.round(height * 0.11);
  const partySvg = Buffer.from(`
    <svg width="${partyW}" height="${partyH}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="78%" text-anchor="middle"
        font-family="DejaVu Sans, Arial Black, Helvetica, Arial, sans-serif"
        font-size="${Math.round(partyH * 0.58)}" font-weight="700"
        letter-spacing="3.4" fill="#111111">BIRTHDAY PARTY</text>
    </svg>
  `);

  const crownLeft = Math.round((width - crownW) / 2);
  const scriptLeft = Math.round((width - scriptW) / 2);
  const chromeLeft = Math.round((width - chromeW) / 2);
  const partyLeft = Math.round((width - partyW) / 2);

  const crownTop = 4;
  const scriptTop = crownTop + crownH + 2;
  // Script overlaps the top of chrome slightly (matches ref stack).
  const chromeTop = scriptTop + Math.round(scriptH * 0.52);
  // BIRTHDAY PARTY sits fully under the chrome mark.
  const partyTop = chromeTop + chromeH + 2;
  const canvasH = partyTop + partyH + 10;

  const mark = await sharp({
    create: {
      width,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: await sharp(crownSvg).png().toBuffer(), top: crownTop, left: crownLeft },
      { input: await sharp(scriptSvg).png().toBuffer(), top: scriptTop, left: scriptLeft },
      { input: chrome, top: chromeTop, left: chromeLeft },
      { input: await sharp(partySvg).png().toBuffer(), top: partyTop, left: partyLeft },
    ])
    .png()
    .toBuffer();

  const trimmed = await sharp(mark).trim({ threshold: 0 }).png().toBuffer();

  if (width === WATERMARK_SIZE.width && height === WATERMARK_SIZE.height) {
    cachedMark = trimmed;
  }
  return trimmed;
}

/**
 * Jagged white torn-paper strip that sits on the photo/border seam.
 */
export function renderTornPaperEdge(width: number, height: number): Buffer {
  const peaks: string[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round((i / steps) * width);
    const base = height * 0.42;
    const wobble =
      Math.sin(i * 1.7) * height * 0.18 +
      Math.cos(i * 0.55) * height * 0.12 +
      ((i * 17) % 7) * (height * 0.03);
    const y = Math.max(2, Math.round(base + wobble));
    peaks.push(`${i === 0 ? "M" : "L"}${x},${y}`);
  }
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <path d="${peaks.join(" ")} L${width},${height} L0,${height} Z"
        fill="#faf8f2"/>
      <path d="${peaks.join(" ")}" fill="none" stroke="#ebe6da" stroke-width="1.2"
        stroke-linejoin="round"/>
    </svg>
  `);
}

/** Clear module caches (tests / asset rebuild scripts). */
export function clearWatermarkCache(): void {
  fontsReady = null;
  cachedChrome = null;
  cachedMark = null;
}
