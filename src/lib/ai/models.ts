import type { ProviderName } from "@/lib/listing/schema";

/**
 * Every image model the seller can pick. Checked against the models our keys can access and the
 * official pricing pages on 5 Oct 2026 (dated snapshots, preview aliases and the shut-down
 * gemini-2.5-flash-image are left out). Prices live in pricing.ts.
 */
export type ImageModelInfo = {
  id: string;
  provider: ProviderName;
  label: string;
  /** One short line for the picker. */
  blurb: string;
  /** Gemini output size. Null = model default (1K). */
  imageSize?: "2K" | null;
  /** Official per-image price when the provider publishes one (at the size we request). */
  officialPerImageUsd?: number;
};

export const IMAGE_MODELS: ImageModelInfo[] = [
  // Gemini — official per-image prices from ai.google.dev/gemini-api/docs/pricing
  { id: "gemini-3-pro-image", provider: "gemini", label: "Nano Banana Pro", blurb: "Highest detail and best text in images. Slowest Gemini.", imageSize: "2K", officialPerImageUsd: 0.134 },
  { id: "gemini-3.1-flash-image", provider: "gemini", label: "Nano Banana 2", blurb: "Great quality, fast. Good default.", imageSize: "2K", officialPerImageUsd: 0.101 },
  { id: "gemini-3.1-flash-lite-image", provider: "gemini", label: "Nano Banana 2 Lite", blurb: "Cheapest and quickest. Simpler scenes.", imageSize: null, officialPerImageUsd: 0.0336 },
  // OpenAI — priced per token; per-image estimate comes from your own past images
  { id: "gpt-image-2.5-sunburst", provider: "openai", label: "GPT Image 2.5 Sunburst", blurb: "Most detailed OpenAI model. Takes longer." },
  { id: "gpt-image-2.5-flare", provider: "openai", label: "GPT Image 2.5 Flare", blurb: "Newest, fast, keeps the product accurate." },
  { id: "gpt-image-2", provider: "openai", label: "GPT Image 2", blurb: "Previous generation. Strong photorealism." },
  { id: "gpt-image-1.5", provider: "openai", label: "GPT Image 1.5", blurb: "Older model, steady results." },
  { id: "gpt-image-1", provider: "openai", label: "GPT Image 1", blurb: "Original GPT image model. Most expensive per image." },
  { id: "gpt-image-1-mini", provider: "openai", label: "GPT Image 1 Mini", blurb: "Cheapest OpenAI option. Lower detail." },
  { id: "chatgpt-image-latest", provider: "openai", label: "ChatGPT Image (latest)", blurb: "Same model as ChatGPT; changes when ChatGPT updates." },
];

export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

export function findImageModel(id: string | null | undefined): ImageModelInfo | undefined {
  return IMAGE_MODELS.find((m) => m.id === id);
}

/** Old rows stored only the provider; map them to the model they used. */
export function legacyModelFor(provider: ProviderName | null | undefined): string {
  return provider === "openai" ? "gpt-image-2.5-flare" : DEFAULT_IMAGE_MODEL;
}

/** Short label for a stored model id (falls back to the id itself, e.g. "zoom out (exact)"). */
export function modelLabel(id: string): string {
  return findImageModel(id)?.label ?? id;
}
