import "server-only";
import sharp from "sharp";
import type { ListingDetails, ProviderName } from "@/lib/listing/schema";
import type { ImageProvider } from "./providers/types";

/** MOCK_AI=1 — lets the whole app run end-to-end without API keys or cost. */
export function mockListing(): ListingDetails {
  return {
    summary: {
      product: "Serrated kitchen knife",
      category: "Home & Kitchen > Kitchen Tools > Knives",
      intendedUse: "Cutting vegetables, fruits and bread at home",
      packQuantity: 2,
      color: "Blue",
      material: "Stainless steel blade, plastic handle",
      brand: "Generic",
    },
    fields: [
      { key: "product_name", label: "Product Name", value: "Serrated Kitchen Knife Pack of 2", note: null, source: "visible", verify: false },
      { key: "generic_name", label: "Generic Name", value: "Kitchen Knife", note: null, source: "visible", verify: false },
      { key: "color", label: "Color", value: "Blue", note: null, source: "visible", verify: false },
      { key: "material", label: "Material", value: "Stainless Steel", note: "Blade; handle is plastic", source: "visible", verify: false },
      { key: "net_quantity", label: "Net Quantity", value: "2", note: "Pieces per customer order", source: "visible", verify: false },
      { key: "maximum_blade_length", label: "Maximum Blade Length", value: "11.5", note: "cm, approximate", source: "estimated", verify: true },
      { key: "product_length", label: "Product Length", value: "22", note: "cm, approximate", source: "estimated", verify: true },
      { key: "product_breadth", label: "Product Breadth", value: "2.5", note: "cm, approximate", source: "estimated", verify: true },
      { key: "product_height", label: "Product Height", value: "1.5", note: "cm, approximate", source: "estimated", verify: true },
      { key: "product_unit", label: "Product Unit", value: "cm", note: null, source: "estimated", verify: false },
      { key: "product_weight", label: "Product Weight", value: "60", note: "Estimate only — weigh before publishing", source: "estimated", verify: true },
      { key: "product_weight_unit", label: "Product Weight Unit", value: "g", note: null, source: "estimated", verify: true },
      { key: "brand", label: "Brand", value: "Generic", note: null, source: "visible", verify: false },
      { key: "country_of_origin", label: "Country of Origin", value: "India", note: null, source: "estimated", verify: true },
      { key: "hsn_code", label: "HSN Code", value: "8211", note: null, source: "estimated", verify: true },
      { key: "gst", label: "GST", value: "18%", note: null, source: "estimated", verify: true },
    ],
    measurements: [
      { name: "Total length", value: 22, unit: "cm", approximate: true },
      { name: "Blade length", value: 11.5, unit: "cm", approximate: true },
      { name: "Product weight", value: 60, unit: "g", approximate: true },
    ],
    title: "Serrated Kitchen Knife Stainless Steel Blue Handle",
    altTitles: ["Stainless Steel Bread & Vegetable Knife Blue", "Serrated Utility Knife for Kitchen, Blue"],
    description:
      "Sharp serrated stainless-steel knife for everyday kitchen cutting.\n\nKey features:\n- Serrated blade for bread, tomatoes and fruit\n- Light plastic handle with easy grip\n\nMaterial: Stainless steel blade, plastic handle\nColour: Blue\nQuantity: Pack of 2\nSize: approx. 22 cm total, 11.5 cm blade\nCare: Hand wash and dry after use.\n\nIn the box: 2 knives.",
    keywords: ["kitchen knife", "serrated knife", "bread knife", "vegetable knife", "stainless steel knife", "knife set of 2"],
    shotPlan: [
      { slot: "primary", prompt: "Blue-handled serrated knife, front view, on white.", callouts: [] },
      { slot: "detail", prompt: "Close-up of the serrated edge and handle joint.", callouts: [] },
      { slot: "size", prompt: "Knife side-on with length lines.", callouts: ["~22 cm", "~11.5 cm blade"] },
    ],
    verifyBeforePublishing: ["Actual weight", "Exact dimensions", "HSN and GST", "Manufacturer and packer details", "Country of origin", "MRP"],
    assumptions: ["Mock data — set MOCK_AI=0 and add API keys for real results."],
    confidence: "medium",
  };
}

export function mockImageProvider(name: ProviderName): ImageProvider {
  const tint = name === "openai" ? { r: 255, g: 240, b: 235 } : { r: 235, g: 242, b: 255 };
  return {
    name,
    model: "mock",
    async generate({ referenceImages, prompt }) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1500));
      // MOCK_FAIL_PROVIDER=gemini simulates a provider outage (tests fallback mode).
      if (process.env.MOCK_FAIL_PROVIDER === name) throw new Error(`${name} mock failure`);
      const label = `${name.toUpperCase()} · ${prompt.split(".")[0].slice(0, 40)}`;
      const svg = Buffer.from(
        `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><text x="40" y="990" font-family="Arial" font-size="30" fill="#605d5d">${label.replace(/[<&>]/g, "")}</text></svg>`,
      );
      const product = await sharp(referenceImages[0]).resize(820, 820, { fit: "inside" }).toBuffer();
      const image = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: tint } })
        .composite([{ input: product, gravity: "center" }, { input: svg }])
        .png()
        .toBuffer();
      return { image, usage: null };
    },
  };
}
