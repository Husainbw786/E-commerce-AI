import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env, requireKey } from "@/lib/env";
import { ListingDetails, SellerQuestions } from "@/lib/listing/schema";
import { LISTING_SYSTEM_PROMPT, QUESTIONS_SYSTEM_PROMPT, listingUserPrompt, type SellerContext } from "./prompts";
import { mockListing, mockQuestions } from "./mock";

let client: OpenAI | undefined;
export function openai() {
  client ??= new OpenAI({ apiKey: requireKey("OPENAI_API_KEY"), maxRetries: 1, timeout: 110_000 });
  return client;
}

export type AnalysisResult = { details: ListingDetails; model: string; usage: unknown };

const imageInputs = (photos: Buffer[]) =>
  photos.map((p) => ({
    type: "input_image" as const,
    image_url: `data:image/jpeg;base64,${p.toString("base64")}`,
    detail: "high" as const,
  }));

export async function analyseProduct(photos: Buffer[], imageCount: number, ctx: SellerContext = {}): Promise<AnalysisResult> {
  const model = env().OPENAI_TEXT_MODEL;
  if (env().MOCK_AI) return { details: mockListing(), model: "mock", usage: null };

  const response = await openai().responses.parse({
    model,
    instructions: LISTING_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: listingUserPrompt(imageCount, photos.length, ctx) },
          ...imageInputs(photos),
        ],
      },
    ],
    text: { format: zodTextFormat(ListingDetails, "listing") },
  });

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("The AI did not return listing details. Try another photo.");
  return { details: parsed, model, usage: response.usage ?? null };
}

export async function askQuestions(photos: Buffer[], notes?: string): Promise<{ questions: SellerQuestions; model: string; usage: unknown }> {
  if (env().MOCK_AI) return { questions: mockQuestions(), model: "mock", usage: null };
  const model = env().OPENAI_QUESTIONS_MODEL ?? env().OPENAI_TEXT_MODEL;
  const text =
    `Here ${photos.length > 1 ? `are ${photos.length} photos of the same product` : "is the product photo"}.` +
    (notes?.trim() ? ` The seller already said: ${notes.trim()}` : "");
  const response = await openai().responses.parse({
    model,
    instructions: QUESTIONS_SYSTEM_PROMPT,
    input: [{ role: "user", content: [{ type: "input_text", text }, ...imageInputs(photos)] }],
    text: { format: zodTextFormat(SellerQuestions, "questions") },
  });
  if (!response.output_parsed) throw new Error("The AI did not return questions.");
  const q = response.output_parsed;
  return {
    questions: { ...q, questions: q.questions.slice(0, 5).map((x) => ({ ...x, options: x.options.slice(0, 4) })) },
    model,
    usage: response.usage ?? null,
  };
}
