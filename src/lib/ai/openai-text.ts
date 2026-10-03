import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env, requireKey } from "@/lib/env";
import { ListingDetails } from "@/lib/listing/schema";
import { LISTING_SYSTEM_PROMPT, listingUserPrompt } from "./prompts";
import { mockListing } from "./mock";

let client: OpenAI | undefined;
export function openai() {
  client ??= new OpenAI({ apiKey: requireKey("OPENAI_API_KEY"), maxRetries: 1, timeout: 110_000 });
  return client;
}

export type AnalysisResult = { details: ListingDetails; model: string; usage: unknown };

export async function analyseProduct(photos: Buffer[], imageCount: number): Promise<AnalysisResult> {
  const model = env().OPENAI_TEXT_MODEL;
  if (env().MOCK_AI) return { details: mockListing(), model: "mock", usage: null };

  const response = await openai().responses.parse({
    model,
    instructions: LISTING_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: listingUserPrompt(imageCount, photos.length) },
          ...photos.map((p) => ({
            type: "input_image" as const,
            image_url: `data:image/jpeg;base64,${p.toString("base64")}`,
            detail: "high" as const,
          })),
        ],
      },
    ],
    text: { format: zodTextFormat(ListingDetails, "listing") },
  });

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("The AI did not return listing details. Try another photo.");
  return { details: parsed, model, usage: response.usage ?? null };
}
