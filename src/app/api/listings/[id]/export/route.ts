import JSZip from "jszip";
import type { NextRequest } from "next/server";
import { HttpError, handler } from "@/lib/http";
import { imageFileName, listingToText, safeSku } from "@/lib/listing/export";
import { slotsFor } from "@/lib/listing/schema";
import { getListing, patchListing } from "@/lib/listing/service";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/** ZIP of the chosen image per slot + listing.txt. */
export const GET = handler(async (req: NextRequest, ctx: RouteContext<"/api/listings/[id]/export">) => {
  const { id } = await ctx.params;
  let listing = await getListing(id);
  if (!listing.details) throw new HttpError(409, "Listing is not ready");
  const details = listing.details;

  const skuParam = req.nextUrl.searchParams.get("sku");
  if (skuParam !== null && skuParam !== listing.sku) listing = await patchListing(id, { sku: skuParam.slice(0, 60) });
  const sku = safeSku(listing.sku);

  const slots = slotsFor(listing.imageCount);
  const zip = new JSZip();
  let added = 0;
  for (const [i, slot] of slots.entries()) {
    const done = listing.images.filter((img) => img.slot === slot && img.status === "done" && img.url);
    const pick = done.find((img) => img.selected) ?? done[done.length - 1];
    if (!pick?.url) continue;
    zip.file(imageFileName(sku, i, slot), await readStoredFile(pick.url));
    added++;
  }
  if (!added) throw new HttpError(409, "No images are ready to export yet");
  zip.file(`${sku}_listing.txt`, listingToText(details, slots));

  const body = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${sku}_meesho.zip"`,
      "Cache-Control": "no-store",
    },
  });
});
