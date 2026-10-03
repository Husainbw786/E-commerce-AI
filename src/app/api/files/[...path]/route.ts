import type { NextRequest } from "next/server";
import { fileKey, readFileByKey, storageBackend } from "@/lib/storage";

export const runtime = "nodejs";

/** Serves files from the private S3 bucket (Neon storage) or, in local dev, from .data/files. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[...path]">) {
  if (storageBackend() === "blob") return new Response("Not found", { status: 404 });
  const { path } = await ctx.params;
  const key = fileKey(path.join("/"));
  if (!key) return new Response("Not found", { status: 404 });
  try {
    const body = await readFileByKey(key);
    return new Response(new Uint8Array(body), {
      // Keys are random UUIDs and never overwritten, so cache forever.
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
