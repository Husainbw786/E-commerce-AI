import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, handler } from "@/lib/http";
import { imageFileName } from "@/lib/listing/export";
import { deleteImage, getListing, selectImage } from "@/lib/listing/service";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

const Body = z.object({ selected: z.literal(true) });

export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/listings/[id]/images/[imageId]">) => {
  const { id, imageId } = await ctx.params;
  Body.parse(await req.json());
  return NextResponse.json({ listing: await selectImage(id, imageId) });
});

/** Download one image with a friendly file name (works for cross-origin Blob URLs). */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/listings/[id]/images/[imageId]">) => {
  const { id, imageId } = await ctx.params;
  const listing = await getListing(id);
  const img = listing.images.find((i) => i.id === imageId);
  if (!img?.url) throw new HttpError(404, "Image not found");
  const index = listing.slots.indexOf(img.slot);
  const name = imageFileName(listing.sku ?? "", Math.max(0, index), img.slot).replace(/\.jpg$/, `_${img.provider}.jpg`);
  const body = await readStoredFile(img.url);
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": "image/jpeg", "Content-Disposition": `attachment; filename="${name}"` },
  });
});

export const DELETE = handler(async (_req: NextRequest, ctx: RouteContext<"/api/listings/[id]/images/[imageId]">) => {
  const { id, imageId } = await ctx.params;
  return NextResponse.json({ listing: await deleteImage(id, imageId) });
});
