import { NextResponse, type NextRequest } from "next/server";
import { handler } from "@/lib/http";
import { ListingPatch } from "@/lib/listing/schema";
import { deleteListing, getListing, patchListing } from "@/lib/listing/service";

export const runtime = "nodejs";

export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/listings/[id]">) => {
  const { id } = await ctx.params;
  return NextResponse.json({ listing: await getListing(id) });
});

export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/listings/[id]">) => {
  const { id } = await ctx.params;
  const patch = ListingPatch.parse(await req.json());
  return NextResponse.json({ listing: await patchListing(id, patch) });
});

export const DELETE = handler(async (_req: NextRequest, ctx: RouteContext<"/api/listings/[id]">) => {
  const { id } = await ctx.params;
  await deleteListing(id);
  return new NextResponse(null, { status: 204 });
});
