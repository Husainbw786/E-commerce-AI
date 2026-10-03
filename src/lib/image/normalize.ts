import "server-only";
import sharp from "sharp";

export const OUTPUT_SIZE = 1500;

/** Square, white-padded, sRGB JPEG — what marketplaces accept everywhere. */
export async function normalizeListingImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

/** Uploaded photo → JPEG ≤ 2048px, EXIF orientation applied. Also validates it is an image. */
export async function normalizeUpload(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** Smaller copy for sending to the text model (cheaper, faster). */
export async function toAnalysisJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input).resize(1280, 1280, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

/**
 * Exact zoom without AI. scale < 1 zooms out (edge pixels are stretched outwards, which
 * looks seamless on studio backgrounds); scale > 1 zooms in (centre crop). Product pixels
 * are never redrawn.
 */
export async function zoomImage(input: Buffer, scale: number): Promise<Buffer> {
  const img = sharp(input);
  const { width = OUTPUT_SIZE, height = OUTPUT_SIZE } = await img.metadata();
  if (scale < 1) {
    const padX = Math.round((width / scale - width) / 2);
    const padY = Math.round((height / scale - height) / 2);
    const padded = await img.extend({ top: padY, bottom: padY, left: padX, right: padX, extendWith: "copy" }).toBuffer();
    return normalizeListingImage(padded);
  }
  const w = Math.round(width / scale);
  const h = Math.round(height / scale);
  const cropped = await img
    .extract({ left: Math.round((width - w) / 2), top: Math.round((height - h) / 2), width: w, height: h })
    .toBuffer();
  return normalizeListingImage(cropped);
}
