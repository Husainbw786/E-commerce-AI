import "server-only";
import { env } from "@/lib/env";
import { PROVIDERS, type ProviderName } from "@/lib/listing/schema";
import { mockImageProvider } from "../mock";
import { geminiImageProvider } from "./gemini-image";
import { openaiImageProvider } from "./openai-image";
import type { ImageProvider } from "./types";

export function getImageProvider(name: ProviderName): ImageProvider {
  if (env().MOCK_AI) return mockImageProvider(name);
  return name === "openai" ? openaiImageProvider() : geminiImageProvider();
}

/** Provider order from IMAGE_PROVIDERS, e.g. "gemini,openai". */
export function providerOrder(): ProviderName[] {
  const order = env()
    .IMAGE_PROVIDERS.split(",")
    .map((p) => p.trim())
    .filter((p): p is ProviderName => (PROVIDERS as readonly string[]).includes(p));
  return order.length ? Array.from(new Set(order)) : ["gemini", "openai"];
}

export type ImagePlan = { mode: "dual" | "fallback"; providers: ProviderName[] };

export function imagePlan(): ImagePlan {
  return { mode: env().IMAGE_MODE, providers: providerOrder() };
}
