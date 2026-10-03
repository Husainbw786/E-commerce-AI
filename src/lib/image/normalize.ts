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
