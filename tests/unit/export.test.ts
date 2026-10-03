import { describe, expect, it } from "vitest";
import { imageFileName, listingToText, safeSku } from "@/lib/listing/export";
import { postprocess } from "@/lib/listing/postprocess";
import { slotsFor } from "@/lib/listing/schema";
import { rawListing } from "./fixture";

describe("export helpers", () => {
  it("cleans SKUs for file names", () => {
    expect(safeSku(" knife / blue #2 ")).toBe("knife-blue-2");
    expect(safeSku("")).toBe("LISTING");
    expect(imageFileName("SKU-1", 0, "primary")).toBe("SKU-1_1_primary.jpg");
  });

  it("writes every section and flags fields to verify", () => {
    const text = listingToText(postprocess(rawListing()), slotsFor(2));
    expect(text).toContain("PRODUCT TITLE");
    expect(text).toContain("HSN Code: 8211  [VERIFY]");
    expect(text).toContain("2. Angle / detail");
    expect(text).not.toContain("3. Size");
  });

  it("slotsFor clamps to 1..3", () => {
    expect(slotsFor(0)).toEqual(["primary"]);
    expect(slotsFor(9)).toEqual(["primary", "detail", "size"]);
  });
});
