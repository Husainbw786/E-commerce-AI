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

export async function analyseProduct(photoJpeg: Buffer, imageCount: number): Promise<AnalysisResult> {
  const model = env().OPENAI_TEXT_MODEL;
  if (env().MOCK_AI) return { details: mockListing(), model: "mock", usage: null };

  const response = await openai().responses.parse({
    model,
    instructions: LISTING_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: listingUserPrompt(imageCount) },
          { type: "input_image", image_url: `data:image/jpeg;base64,${photoJpeg.toString("base64")}`, detail: "high" },
        ],
      },
    ],
    text: { format: zodTextFormat(ListingDetails, "listing") },
  });

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("The AI did not return listing details. Try another photo.");
  return { details: parsed, model, usage: response.usage ?? null };
}
