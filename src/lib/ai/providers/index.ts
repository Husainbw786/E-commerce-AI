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

/** Providers the seller can choose, in IMAGE_PROVIDERS order; only those with an API key (all in mock mode). */
export function availableProviders(): ProviderName[] {
  const e = env();
  const order = e.IMAGE_PROVIDERS.split(",")
    .map((p) => p.trim())
    .filter((p): p is ProviderName => (PROVIDERS as readonly string[]).includes(p));
  const all = Array.from(new Set([...order, ...PROVIDERS]));
  if (e.MOCK_AI) return all;
  return all.filter((p) => (p === "openai" ? !!e.OPENAI_API_KEY : !!e.GEMINI_API_KEY));
}

export function defaultProvider(): ProviderName {
  return availableProviders()[0] ?? "gemini";
}
