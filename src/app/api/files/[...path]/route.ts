import { readFile } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { localPathFor } from "@/lib/storage";

export const runtime = "nodejs";

/** Local-dev only: serves files saved to .data/files when Vercel Blob is not configured. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[...path]">) {
  if (process.env.VERCEL) return new Response("Not found", { status: 404 });
  const { path } = await ctx.params;
  const full = localPathFor(path.join("/"));
  if (!full) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(full);
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
