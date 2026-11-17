/**
 * Builds public/images/booth/polaroid-watermark.png + proof crop.
 * Keep in sync with src/lib/booth/watermark.ts + polaroid.ts.
 * Run: node scripts/build-polaroid-watermark.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WATERMARK_SIZE = { width: 720, height: 340 };
const CROWN_PATH = "M8 38 14 16l16 12L36 6l6 22 16-12 6 22H8z";
const SCRIPT_TEXT = "Landon & Jordan's";
const FRAME = { photo: 900, padTop: 48, padSide: 48, padBottom: 380 };
const PAPER = { r: 250, g: 248, b: 242 };

async function ensureFonts() {
  const fontsDir = path.join(root, "src", "fonts");
  const confDir = path.join(root, ".cache", "booth-fonts");
  const confPath = path.join(confDir, "fonts.conf");
  await fs.mkdir(confDir, { recursive: true });
  await fs.writeFile(
    confPath,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>${path.join(confDir, "cache")}</cachedir>
</fontconfig>
`,
  );
  process.env.FONTCONFIG_FILE = confPath;
}

function quadPoint(t, p0, p1, p2) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function quadTangent(t, p0, p1, p2) {
  const tx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const ty = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(ty, tx) * 180) / Math.PI;
}

function buildArchedScriptSvg(width, height) {
  const fontSize = Math.round(height * 0.62);
  const chars = [...SCRIPT_TEXT];
  const advances = {
    L: 0.62, a: 0.48, n: 0.5, d: 0.52, o: 0.5, " ": 0.28,
    "&": 0.55, J: 0.58, r: 0.36, "'": 0.22, s: 0.4,
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
  const nodes = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const adv = scaledGaps[i];
    const t = scaledTotal === 0 ? 0 : (walked + adv / 2) / scaledTotal;
    const pt = quadPoint(t, p0, p1, p2);
    const angle = quadTangent(t, p0, p1, p2);
    const safe = ch === "&" ? "&amp;" : ch === "'" ? "&apos;" : ch;
    nodes.push(`<text x="${pt.x.toFixed(2)}" y="${pt.y.toFixed(2)}" text-anchor="middle"
      transform="rotate(${angle.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)})"
      font-family="Hastron" font-size="${(fontSize * scale).toFixed(2)}"
      fill="#5c2a7a">${safe}</text>`);
    walked += adv;
  }
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${nodes.join("")}</svg>`);
}

function renderTornPaperEdge(width, height) {
  const peaks = [];
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
      <path d="${peaks.join(" ")} L${width},${height} L0,${height} Z" fill="#faf8f2"/>
      <path d="${peaks.join(" ")}" fill="none" stroke="#ebe6da" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>
  `);
}

async function renderPolaroidWatermark(width = WATERMARK_SIZE.width, height = WATERMARK_SIZE.height) {
  const chromeRaw = await fs.readFile(path.join(root, "public", "images", "chrome-80s.png"));
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
  const chromeTop = scriptTop + Math.round(scriptH * 0.52);
  const partyTop = chromeTop + chromeH + 2;
  const canvasH = partyTop + partyH + 10;

  const mark = await sharp({
    create: { width, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: await sharp(crownSvg).png().toBuffer(), top: crownTop, left: crownLeft },
      { input: await sharp(scriptSvg).png().toBuffer(), top: scriptTop, left: scriptLeft },
      { input: chrome, top: chromeTop, left: chromeLeft },
      { input: await sharp(partySvg).png().toBuffer(), top: partyTop, left: partyLeft },
    ])
    .png()
    .toBuffer();

  return sharp(mark).trim({ threshold: 0 }).png().toBuffer();
}

async function composeBrandedPolaroid(photoJpeg) {
  const photoSize = FRAME.photo;
  const width = photoSize + FRAME.padSide * 2;
  const height = photoSize + FRAME.padTop + FRAME.padBottom;

  const photo = await sharp(photoJpeg)
    .resize(photoSize, photoSize, { fit: "cover", position: "attention" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const tornH = 38;
  const torn = await sharp(renderTornPaperEdge(photoSize, tornH)).png().toBuffer();
  const tornTop = FRAME.padTop + photoSize - Math.round(tornH * 0.55);

  const markRaw = await renderPolaroidWatermark();
  const markMaxW = Math.round(width * 0.58);
  const markMaxH = FRAME.padBottom - 28;
  const mark = await sharp(markRaw)
    .resize({ width: markMaxW, height: markMaxH, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const markMeta = await sharp(mark).metadata();
  const markW = markMeta.width || markMaxW;
  const markH = markMeta.height || Math.round(markW * 0.45);
  const markLeft = Math.round((width - markW) / 2);
  const borderStart = FRAME.padTop + photoSize;
  const markTop = borderStart + Math.max(12, Math.round((FRAME.padBottom - markH) / 2));

  return sharp({ create: { width, height, channels: 3, background: PAPER } })
    .composite([
      { input: photo, top: FRAME.padTop, left: FRAME.padSide },
      { input: torn, top: tornTop, left: FRAME.padSide },
      { input: mark, top: markTop, left: markLeft },
    ])
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer();
}

async function main() {
  await ensureFonts();
  const mark = await renderPolaroidWatermark();
  const outMark = path.join(root, "public", "images", "booth", "polaroid-watermark.png");
  await fs.mkdir(path.dirname(outMark), { recursive: true });
  await fs.writeFile(outMark, mark);
  console.log("watermark", await sharp(mark).metadata());

  let sample = null;
  for (const c of [
    "public/images/booth/sample-after-face.jpg",
    "public/images/hero-couple-cutout.png",
  ]) {
    try {
      sample = await fs.readFile(path.join(root, c));
      console.log("sample", c);
      break;
    } catch {
      /* next */
    }
  }
  if (!sample) throw new Error("no sample photo");

  const branded = await composeBrandedPolaroid(sample);
  await fs.writeFile("/tmp/polaroid-branded-full.jpg", branded);
  const meta = await sharp(branded).metadata();
  console.log("branded", meta.width, "x", meta.height);

  const cropH = 360;
  const cropW = Math.min(780, meta.width);
  const proof = await sharp(branded)
    .extract({
      left: Math.max(0, Math.round((meta.width - cropW) / 2)),
      top: meta.height - cropH,
      width: cropW,
      height: cropH,
    })
    .png()
    .toBuffer();
  await fs.mkdir("/opt/cursor/artifacts/photo-booth", { recursive: true });
  await fs.writeFile("/opt/cursor/artifacts/photo-booth/polaroid-watermark.png", proof);

  const mm = await sharp(mark).metadata();
  const preview = await sharp({
    create: { width: mm.width, height: mm.height, channels: 3, background: PAPER },
  })
    .composite([{ input: mark, top: 0, left: 0 }])
    .png()
    .toBuffer();
  await fs.writeFile("/tmp/watermark-preview.png", preview);
  console.log("proof ok", proof.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
