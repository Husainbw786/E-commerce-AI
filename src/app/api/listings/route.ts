import { NextResponse, type NextRequest } from "next/server";
import { HttpError, clientIp, handler } from "@/lib/http";
import { CreateListingBody } from "@/lib/listing/schema";
import { createListing, listListings } from "@/lib/listing/service";
import { checkRateLimit } from "@/lib/ratelimit";
import { isStoredUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

export const GET = handler(async () => {
  return NextResponse.json({ listings: await listListings() });
});

export const POST = handler(async (req: NextRequest) => {
  const body = CreateListingBody.parse(await req.json());
  if (!body.sourceUrls.every(isStoredUrl)) throw new HttpError(400, "Please upload the photos first.");

  const ip = clientIp(req);
  const limited = await checkRateLimit("listing", ip);
  if (limited) throw new HttpError(429, limited);

  const listing = await createListing({ ...body, clientIp: ip });
  return NextResponse.json({ listing }, { status: 201 });
});
