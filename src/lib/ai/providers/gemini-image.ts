import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";
import { requireKey } from "@/lib/env";
import { findImageModel } from "../models";
import type { ImageProvider } from "./types";

let client: GoogleGenAI | undefined;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: requireKey("GEMINI_API_KEY") });
  return client;
}

export function geminiImageProvider(model: string): ImageProvider {
  const imageSize = findImageModel(model)?.imageSize ?? null;
  return {
    name: "gemini",
    model,
    async generate({ referenceImages, prompt }) {
      const response = await gemini().models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              ...referenceImages.map((img) => ({ inlineData: { mimeType: "image/jpeg", data: img.toString("base64") } })),
              { text: prompt },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.IMAGE],
          imageConfig: { aspectRatio: "1:1", ...(imageSize ? { imageSize } : {}) },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p) => p.inlineData?.data);
      if (!imagePart?.inlineData?.data) {
        const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason;
        throw new Error(`Gemini returned no image${reason ? ` (${reason})` : ""}`);
      }
      return { image: Buffer.from(imagePart.inlineData.data, "base64"), usage: response.usageMetadata ?? null };
    },
  };
}
