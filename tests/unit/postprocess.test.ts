import { describe, expect, it } from "vitest";
import { DESCRIPTION_MAX, ensureTitlePack, postprocess } from "@/lib/listing/postprocess";
import { rawListing } from "./fixture";

describe("postprocess", () => {
  const out = postprocess(rawListing());
  const field = (k: string) => out.fields.find((f) => f.key === k)!;

  it("normalises keys and drops duplicates", () => {
    expect(field("product_name").value).toBe("Knife");
    expect(out.fields.filter((f) => f.key === "color")).toHaveLength(1);
  });

  it("never keeps invented supplier details or country of origin", () => {
    expect(field("manufacturer_name")).toMatchObject({ value: "", source: "unknown", verify: true });
    expect(field("country_of_origin")).toMatchObject({ value: "", verify: true });
  });

  it("adds missing supplier fields as blanks", () => {
    expect(field("packer_address")).toMatchObject({ value: "", verify: true });
    expect(field("importer_pincode")).toBeDefined();
  });

  it("forces verify on tax and weight", () => {
    expect(field("hsn_code").verify).toBe(true);
    expect(field("hsn_code").note).toMatch(/verify/i);
    expect(field("product_weight").verify).toBe(true);
  });

  it("keeps net quantity equal to pack quantity", () => {
    expect(field("net_quantity").value).toBe("2");
  });

  it("puts pack quantity in titles", () => {
    expect(out.title).toBe("Serrated Kitchen Knife Blue (Pack of 2)");
    expect(out.altTitles).toEqual(["A (Pack of 2)", "B (Pack of 2)"]);
  });

  it("limits description and dedupes keywords", () => {
    expect(out.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.keywords).toEqual(["knife", "bread knife"]);
  });

  it("fills a shot plan entry for every slot", () => {
    expect(out.shotPlan.map((s) => s.slot)).toEqual(["primary", "detail", "size"]);
    expect(out.shotPlan[1].prompt).toContain("Kitchen knife");
  });

  it("treats pack quantity below 1 as 1", () => {
    expect(postprocess(rawListing({ summary: { ...rawListing().summary, packQuantity: 0 } })).summary.packQuantity).toBe(1);
  });
});

describe("ensureTitlePack", () => {
  it("leaves titles that already state the pack", () => {
    expect(ensureTitlePack("Knife Set of 2", 2)).toBe("Knife Set of 2");
    expect(ensureTitlePack("Knife 2 pcs", 2)).toBe("Knife 2 pcs");
    expect(ensureTitlePack("Knife", 1)).toBe("Knife");
  });
});
