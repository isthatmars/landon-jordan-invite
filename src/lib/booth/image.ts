import sharp from "sharp";

/**
 * Strip EXIF/GPS and normalize to JPEG RGB.
 * Kept separate from Polaroid compositing so upload routes do not load watermark/fonts.
 */
export async function sanitizeImage(input: Buffer): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  mime: "image/jpeg";
}> {
  const image = sharp(input, { failOn: "none", unlimited: true }).rotate();
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
