import { describe, expect, it } from "vitest";
import { buildEditPrompt, buildImagePrompt, listingUserPrompt, zoomScaleFor } from "@/lib/ai/prompts";
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

  it("puts the seller's request first, above the slot rules", () => {
    const p = buildImagePrompt(d, "detail", "  zoom out a little ");
    expect(p.startsWith("SELLER'S REQUEST: zoom out a little")).toBe(true);
    expect(p.indexOf("SELLER'S REQUEST")).toBeLessThan(p.indexOf("ANGLE / DETAIL IMAGE"));
    expect(p).toMatch(/HIGHEST priority/);
  });

  it("uses the seller's scene for the lifestyle image and skips the pack line", () => {
    const p = buildImagePrompt(d, "lifestyle", undefined, "on a bathroom wall");
    expect(p).toContain("IN-USE / LIFESTYLE IMAGE");
    expect(p).toContain("Setting chosen by the seller: on a bathroom wall");
    expect(p).not.toContain("pack of 2");
  });
});

describe("buildEditPrompt", () => {
  it("edits the first image and keeps everything else", () => {
    const p = buildEditPrompt("detail", "zoom out a little");
    expect(p).toMatch(/^EDIT THE FIRST IMAGE/);
    expect(p).toContain("zoom out a little");
    expect(p).toMatch(/Do NOT return the same image/);
  });
});

describe("zoomScaleFor", () => {
  it("handles the seller's real zoom-out wording in code", () => {
    expect(zoomScaleFor("the image is good but it looking like it very zoom can we make it short?means zoom out a little")).toBeCloseTo(0.88);
    expect(zoomScaleFor("zoom out")).toBeCloseTo(0.8);
    expect(zoomScaleFor("zoom in a lot")).toBeCloseTo(1.3);
  });
  it("leaves real image changes to the AI", () => {
    expect(zoomScaleFor("zoom out and make the background white")).toBeNull();
    expect(zoomScaleFor("warmer light")).toBeNull();
  });
});

describe("listingUserPrompt", () => {
  it("includes seller answers, notes and scene; drops empty answers", () => {
    const p = listingUserPrompt(2, 1, {
      notes: "sold in silver too",
      answers: [
        { question: "Pieces per order?", answer: "2" },
        { question: "Brand?", answer: "  " },
      ],
      lifestyleScene: "bathroom wall",
    });
    expect(p).toContain("Pieces per order? → 2");
    expect(p).not.toContain("Brand?");
    expect(p).toContain("Seller's notes: sold in silver too");
    expect(p).toContain("bathroom wall");
  });
});
