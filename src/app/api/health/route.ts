import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { storageBackend } from "@/lib/storage";
import { availableProviders } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shows which services are configured (never the values). */
export function GET() {
  const e = env();
  return NextResponse.json({
    mockAi: e.MOCK_AI,
    openai: !!e.OPENAI_API_KEY,
    gemini: !!e.GEMINI_API_KEY,
    database: e.DATABASE_URL ? "neon" : "local-pglite",
    storage: storageBackend(),
    rateLimit: !!(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN),
    models: { text: e.OPENAI_TEXT_MODEL, openaiImage: e.OPENAI_IMAGE_MODEL, geminiImage: e.GEMINI_IMAGE_MODEL },
    imageProviders: availableProviders(),
  });
}
