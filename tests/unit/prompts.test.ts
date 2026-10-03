import { describe, expect, it } from "vitest";
import { buildImagePrompt } from "@/lib/ai/prompts";
import { postprocess } from "@/lib/listing/postprocess";
import { rawListing } from "./fixture";

describe("buildImagePrompt", () => {
  const d = postprocess(
    rawListing({ shotPlan: [{ slot: "size", prompt: "side view", callouts: ["~22 cm", "~4 cm", "~1 cm", "extra"] }] }),
  );

  it("always forbids collages and asks for fidelity", () => {
    const p = buildImagePrompt(d, "primary");
    expect(p).toMatch(/never a collage/i);
    expect(p).toMatch(/pure white/i);
    expect(p).toContain("pack of 2");
  });

  it("only renders up to 3 given labels on the size image", () => {
    const p = buildImagePrompt(d, "size");
    expect(p).toContain('"~22 cm", "~4 cm", "~1 cm"');
    expect(p).not.toContain("extra");
  });

  it("never renders placeholder labels without numbers", () => {
    const pending = postprocess(rawListing({ shotPlan: [{ slot: "size", prompt: "side", callouts: ["Height: pending", "Width: TBD"] }] }));
    const p = buildImagePrompt(pending, "size");
    expect(p).not.toContain("pending");
    expect(p).toContain("without any text labels");
  });

  it("appends the seller adjustment", () => {
    expect(buildImagePrompt(d, "detail", "  softer shadow ")).toContain("softer shadow");
  });
});
