import { NextResponse, type NextRequest } from "next/server";
import { HttpError, clientIp, handler } from "@/lib/http";
import { normalizeUpload } from "@/lib/image/normalize";
import { checkRateLimit } from "@/lib/ratelimit";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";

// The browser compresses photos before upload, so this stays well under Vercel's 4.5 MB body limit.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);

export const POST = handler(async (req: NextRequest) => {
  const limited = await checkRateLimit("upload", clientIp(req));
  if (limited) throw new HttpError(429, limited);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Photo is too large. Please use one under 4 MB.");
  if (file.type && !ALLOWED.has(file.type)) throw new HttpError(415, "Please upload a JPG, PNG or WEBP photo.");

  let jpeg: Buffer;
  try {
    jpeg = await normalizeUpload(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new HttpError(415, "That file doesn't look like a photo we can read. Try a JPG or PNG.");
  }
  const url = await saveFile("uploads", "jpg", jpeg, "image/jpeg");
  return NextResponse.json({ url });
});
