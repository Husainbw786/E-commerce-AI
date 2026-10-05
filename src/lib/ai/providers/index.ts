import "server-only";
import { env } from "@/lib/env";
import { mockImageProvider } from "../mock";
import { DEFAULT_IMAGE_MODEL, IMAGE_MODELS, findImageModel, type ImageModelInfo } from "../models";
import { geminiImageProvider } from "./gemini-image";
import { openaiImageProvider } from "./openai-image";
import type { ImageProvider } from "./types";

/** Provider instance for one image model id. */
export function getImageProvider(modelId: string): ImageProvider {
  const info = findImageModel(modelId);
  if (!info) throw new Error(`Unknown image model: ${modelId}`);
  if (env().MOCK_AI) return { ...mockImageProvider(info.provider), model: info.id };
  return info.provider === "openai" ? openaiImageProvider(info.id) : geminiImageProvider(info.id);
}

/** Models the seller can choose: those whose provider has an API key (all of them in mock mode). */
export function availableImageModels(): ImageModelInfo[] {
  const e = env();
  if (e.MOCK_AI) return IMAGE_MODELS;
  return IMAGE_MODELS.filter((m) => (m.provider === "openai" ? !!e.OPENAI_API_KEY : !!e.GEMINI_API_KEY));
}

export function defaultImageModel(): string {
  const available = availableImageModels();
  const wanted = env().DEFAULT_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;
  return available.find((m) => m.id === wanted)?.id ?? available[0]?.id ?? DEFAULT_IMAGE_MODEL;
}

export function isAvailableModel(id: string): boolean {
  return availableImageModels().some((m) => m.id === id);
}
