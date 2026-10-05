/**
 * USD prices per 1M tokens, standard tier. Checked against the official pages on 5 Oct 2026:
 * - https://developers.openai.com/api/docs/pricing
 * - https://ai.google.dev/gemini-api/docs/pricing
 * Update here when a provider changes prices. Each usage event stores its cost at call time,
 * so changing a price never rewrites past costs.
 */
type TextRates = { kind: "openai-text"; input: number; cachedInput: number; cacheWrite: number; output: number; longContextAt?: number };
type OpenAIImageRates = { kind: "openai-image"; textInput: number; imageInput: number; imageOutput: number; textOutput: number };
type GeminiRates = { kind: "gemini"; input: number; textOutput: number; imageOutput: number };
type Rates = TextRates | OpenAIImageRates | GeminiRates;

export const PRICES: Record<string, Rates> = {
  // Text model (listing details + questions). https://developers.openai.com/api/docs/models/gpt-6.1-sol
  "gpt-6.1-sol": { kind: "openai-text", input: 2, cachedInput: 0.1, cacheWrite: 2.5, output: 10, longContextAt: 272_000 },
  // OpenAI image models
  "gpt-image-2.5-sunburst": { kind: "openai-image", textInput: 5, imageInput: 8, imageOutput: 30, textOutput: 0 },
  "gpt-image-2.5-flare": { kind: "openai-image", textInput: 5, imageInput: 8, imageOutput: 30, textOutput: 0 },
  "gpt-image-2": { kind: "openai-image", textInput: 5, imageInput: 8, imageOutput: 30, textOutput: 0 },
  "gpt-image-1.5": { kind: "openai-image", textInput: 5, imageInput: 8, imageOutput: 32, textOutput: 10 },
  "gpt-image-1": { kind: "openai-image", textInput: 5, imageInput: 10, imageOutput: 40, textOutput: 0 },
  "gpt-image-1-mini": { kind: "openai-image", textInput: 2, imageInput: 2.5, imageOutput: 8, textOutput: 0 },
  "chatgpt-image-latest": { kind: "openai-image", textInput: 5, imageInput: 8, imageOutput: 32, textOutput: 10 },
  // Gemini image models
  "gemini-3-pro-image": { kind: "gemini", input: 2, textOutput: 12, imageOutput: 120 },
  "gemini-3.1-flash-image": { kind: "gemini", input: 0.5, textOutput: 3, imageOutput: 60 },
  "gemini-3.1-flash-lite-image": { kind: "gemini", input: 0.25, textOutput: 1.5, imageOutput: 30 },
};

export type UsageCost = { inputTokens: number; outputTokens: number; costUsd: number | null };

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const M = 1_000_000;

/** Turns a provider's raw usage object into tokens + USD cost. costUsd is null when the model has no price entry. */
export function costOf(model: string, usage: unknown): UsageCost {
  const u = (usage ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const rates = PRICES[model] ?? PRICES[model.replace(/-\d{4}-\d{2}-\d{2}$/, "")];

  if ("promptTokenCount" in u || "candidatesTokenCount" in u) {
    // Gemini usageMetadata. Output = image tokens + text/thinking tokens.
    const input = n(u.promptTokenCount);
    const output = n(u.candidatesTokenCount) + n(u.thoughtsTokenCount);
    const imageOut = (u.candidatesTokensDetails ?? []).filter((d: any) => d.modality === "IMAGE").reduce((s: number, d: any) => s + n(d.tokenCount), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (rates?.kind !== "gemini") return { inputTokens: input, outputTokens: output, costUsd: null };
    const cost = (input * rates.input + imageOut * rates.imageOutput + (output - imageOut) * rates.textOutput) / M;
    return { inputTokens: input, outputTokens: output, costUsd: cost };
  }

  const input = n(u.input_tokens);
  const output = n(u.output_tokens);
  if (!rates) return { inputTokens: input, outputTokens: output, costUsd: null };

  if (rates.kind === "openai-image") {
    const d = u.input_tokens_details ?? {};
    const imageIn = n(d.image_tokens);
    const textIn = d.text_tokens !== undefined ? n(d.text_tokens) : input - imageIn;
    const od = u.output_tokens_details ?? {};
    const textOut = n(od.text_tokens);
    const cost = (textIn * rates.textInput + imageIn * rates.imageInput + (output - textOut) * rates.imageOutput + textOut * rates.textOutput) / M;
    return { inputTokens: input, outputTokens: output, costUsd: cost };
  }

  if (rates.kind === "openai-text") {
    const d = u.input_tokens_details ?? {};
    const cached = n(d.cached_tokens);
    const written = n(d.cache_write_tokens);
    const plain = Math.max(0, input - cached - written);
    const long = rates.longContextAt !== undefined && input > rates.longContextAt;
    const inMul = long ? 2 : 1;
    const outMul = long ? 1.5 : 1;
    const cost = ((plain * rates.input + cached * rates.cachedInput + written * rates.cacheWrite) * inMul + output * rates.output * outMul) / M;
    return { inputTokens: input, outputTokens: output, costUsd: cost };
  }

  return { inputTokens: input, outputTokens: output, costUsd: null };
}

/** "$0.074" for small amounts, "$1.23" otherwise; adds "≈ ₹6" when a rate is given. */
export function formatUsd(usd: number | null | undefined, usdToInr?: number | null): string {
  if (usd === null || usd === undefined) return "—";
  const dollars = usd === 0 ? "$0" : usd < 1 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`;
  if (!usdToInr || usd === 0) return dollars;
  const inr = usd * usdToInr;
  return `${dollars} (≈ ₹${inr < 10 ? inr.toFixed(1) : Math.round(inr)})`;
}
