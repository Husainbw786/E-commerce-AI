import { NextResponse, type NextRequest } from "next/server";
import { HttpError, clientIp, handler } from "@/lib/http";
import { QuestionsBody } from "@/lib/listing/schema";
import { questionsFor } from "@/lib/listing/service";
import { checkRateLimit } from "@/lib/ratelimit";
import { isStoredUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 90;

/** AI looks at the uploaded photos and returns a few questions for the seller. */
export const POST = handler(async (req: NextRequest) => {
  const body = QuestionsBody.parse(await req.json());
  if (!body.sourceUrls.every(isStoredUrl)) throw new HttpError(400, "Please upload the photos first.");
  const limited = await checkRateLimit("listing", clientIp(req));
  if (limited) throw new HttpError(429, limited);
  return NextResponse.json({ questions: await questionsFor(body) });
});
