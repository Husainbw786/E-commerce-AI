import type { ListingDetails } from "@/lib/listing/schema";

export function rawListing(over: Partial<ListingDetails> = {}): ListingDetails {
  return {
    summary: { product: "Kitchen knife", category: "Home > Knives", intendedUse: "Cutting", packQuantity: 2, color: "Blue", material: "Steel", brand: "Generic" },
    fields: [
      { key: "Product Name", label: "Product Name", value: " Knife ", note: null, source: "visible", verify: false },
      { key: "manufacturer_name", label: "Manufacturer Name", value: "Acme Pvt Ltd", note: null, source: "estimated", verify: false },
      { key: "country_of_origin", label: "Country of Origin", value: "China", note: null, source: "estimated", verify: false },
      { key: "hsn_code", label: "HSN Code", value: "8211", note: null, source: "estimated", verify: false },
      { key: "product_weight", label: "Product Weight", value: "60", note: null, source: "visible", verify: false },
      { key: "net_quantity", label: "Net Quantity", value: "6", note: null, source: "visible", verify: false },
      { key: "color", label: "Color", value: "Blue", note: null, source: "visible", verify: false },
      { key: "color", label: "Colour dup", value: "Red", note: null, source: "visible", verify: false },
    ],
    measurements: [],
    title: "Serrated Kitchen Knife Blue",
    altTitles: ["A", "B", "C"],
    description: "x".repeat(2000),
    keywords: ["knife", "knife", " ", "bread knife"],
    shotPlan: [{ slot: "primary", prompt: "hero", callouts: [] }],
    verifyBeforePublishing: [],
    assumptions: [],
    confidence: "high",
    ...over,
  };
}
