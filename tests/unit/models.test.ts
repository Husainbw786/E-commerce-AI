import { describe, expect, it } from "vitest";
import { IMAGE_MODELS, findImageModel, legacyModelFor, modelLabel } from "@/lib/ai/models";
import { PRICES } from "@/lib/ai/pricing";

describe("image model catalog", () => {
  it("has a price for every model so cost tracking never shows a gap", () => {
    for (const m of IMAGE_MODELS) expect(PRICES[m.id], m.id).toBeDefined();
  });

  it("has unique ids and both providers", () => {
    expect(new Set(IMAGE_MODELS.map((m) => m.id)).size).toBe(IMAGE_MODELS.length);
    expect(IMAGE_MODELS.some((m) => m.provider === "gemini")).toBe(true);
    expect(IMAGE_MODELS.some((m) => m.provider === "openai")).toBe(true);
  });

  it("maps old provider-only listings and labels unknown ids", () => {
    expect(legacyModelFor("openai")).toBe("gpt-image-2.5-flare");
    expect(legacyModelFor(null)).toBe("gemini-3.1-flash-image");
    expect(modelLabel("gemini-3-pro-image")).toBe("Nano Banana Pro");
    expect(modelLabel("zoom out (exact)")).toBe("zoom out (exact)");
    expect(findImageModel("gemini-2.5-flash-image")).toBeUndefined(); // shut down 2 Oct 2026
  });
});
