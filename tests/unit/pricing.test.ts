import { describe, expect, it } from "vitest";
import { costOf, formatUsd } from "@/lib/ai/pricing";

// Real usage payloads recorded from the providers.
describe("costOf", () => {
  it("prices a GPT-6.1 Sol listing call with cache writes", () => {
    const c = costOf("gpt-6.1-sol", {
      input_tokens: 4226,
      output_tokens: 3038,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 4223 },
    });
    // 3×$2 + 4223×$2.50 + 3038×$10 per 1M
    expect(c.costUsd).toBeCloseTo((3 * 2 + 4223 * 2.5 + 3038 * 10) / 1e6, 8);
    expect(c).toMatchObject({ inputTokens: 4226, outputTokens: 3038 });
  });

  it("prices a gpt-image-2.5-flare edit", () => {
    const c = costOf("gpt-image-2.5-flare", {
      input_tokens: 2809,
      output_tokens: 1756,
      input_tokens_details: { text_tokens: 399, image_tokens: 2410 },
      output_tokens_details: { text_tokens: 0, image_tokens: 1756 },
    });
    expect(c.costUsd).toBeCloseTo((399 * 5 + 2410 * 8 + 1756 * 30) / 1e6, 8);
  });

  it("prices a Gemini image with image and thinking output separately", () => {
    const c = costOf("gemini-3.1-flash-image", {
      promptTokenCount: 818,
      candidatesTokenCount: 1957,
      candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1680 }],
    });
    expect(c.costUsd).toBeCloseTo((818 * 0.5 + 1680 * 60 + 277 * 3) / 1e6, 8);
    expect(c.outputTokens).toBe(1957);
  });

  it("prices gpt-6-luna", () => {
    expect(costOf("gpt-6-luna", { input_tokens: 3000, output_tokens: 2400 }).costUsd).toBeCloseTo((3000 * 0.1 + 2400 * 0.5) / 1e6, 10);
  });

  it("returns null cost for unknown models and zero for no usage", () => {
    expect(costOf("some-new-model", { input_tokens: 10, output_tokens: 5 }).costUsd).toBeNull();
    expect(costOf("gpt-6.1-sol", null).costUsd).toBe(0);
    expect(costOf("gpt-6-astra", { input_tokens: 10 }).costUsd).toBeNull(); // removed; past rows keep their stored cost
  });

  it("accepts dated snapshots", () => {
    expect(costOf("gpt-image-2.5-flare-2026-09-08", { input_tokens: 1000, output_tokens: 0 }).costUsd).toBeCloseTo(0.005, 8);
  });
});

describe("formatUsd", () => {
  it("formats small and large amounts, with optional rupees", () => {
    expect(formatUsd(0.0741)).toBe("$0.074");
    expect(formatUsd(2.5)).toBe("$2.50");
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(0.05, 88)).toBe("$0.050 (≈ ₹4.4)");
    expect(formatUsd(0.2, 88)).toBe("$0.200 (≈ ₹18)");
  });
});
