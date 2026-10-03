import { NextResponse, type NextRequest } from "next/server";
import { HttpError, clientIp, handler } from "@/lib/http";
import { GenerateImageBody } from "@/lib/listing/schema";
import { generateImage } from "@/lib/listing/service";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
// One image per request keeps every call well under Vercel's limit.
export const maxDuration = 180;

export const POST = handler(async (req: NextRequest, ctx: RouteContext<"/api/listings/[id]/images">) => {
  const { id } = await ctx.params;
  const body = GenerateImageBody.parse(await req.json());

  const limited = await checkRateLimit("image", clientIp(req));
  if (limited) throw new HttpError(429, limited);

  const image = await generateImage({ listingId: id, ...body });
  return NextResponse.json({ image });
});
