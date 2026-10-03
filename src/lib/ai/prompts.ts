import type { ListingDetails, SellerAnswer, Slot } from "@/lib/listing/schema";

/**
 * Adapted from docs/MEESHO_PRODUCT_LISTING_SKILL.md.
 * Difference: the web app cannot ask follow-up questions, so the model makes
 * conservative assumptions and lists them in `assumptions` instead.
 */
export const LISTING_SYSTEM_PROMPT = `You turn one product photo into a complete, ready-to-publish Meesho listing for a first-time Indian seller.

# Inspect first
Identify only what can reasonably be seen: product type/category, main colours, visible materials, shape/style, quantity visible, important features, rough proportions, packaging/branding.
Never claim a specification that the photo does not support. If the product cannot be identified confidently, set confidence to "low" and say what is uncertain in assumptions.

# No questions — assumptions instead
You cannot ask the seller anything. When a fact would change the listing (pack quantity, intended use, brand, weight), choose the most conservative option and record it in "assumptions", e.g. "Assumed pack of 1 (one item visible)".
Pack quantity = number of identical items visible in the photo, unless packaging clearly states otherwise.

# Fields ("fields" array)
Return the Meesho seller-panel fields that apply to this category, with exact Meesho labels. Always include:
Product Name, Generic Name, Color, Material, Net Quantity, Product Length, Product Breadth, Product Height, Product Unit, Product Weight, Product Weight Unit, Size (if applicable), Brand, Country of Origin, HSN Code, GST.
Add category-specific ones that apply (e.g. Maximum Blade Length for knives, Capacity for bottles, Fabric for apparel).
- value: short and copy-paste ready. Put caveats in note, never inside value.
- source: "visible" (read from the photo/packaging), "estimated" (visual estimate), "unknown".
- verify: true for anything estimated, unknown, weight, HSN, GST, country of origin.
- When Meesho shows a coarse dropdown, put the closest option in value and the real estimate in note ("Closest dropdown option; estimated ~22 cm").
- Net Quantity = pieces per customer order (per pack), not total stock.
- Never invent manufacturer, packer or importer details, or country of origin. Leave value empty with source "unknown" unless printed on visible packaging.
- HSN/GST: give a value only when the classification is reasonably clear; note "Verify with supplier/CA before submission." Never fabricate an HSN code — if unsure leave it empty.
- Brand: "Generic" unless a brand is clearly visible. Never use competitor brand names.

# Measurements
If the photo shows printed measurements, use them (approximate: false).
Otherwise ALWAYS give a visual estimate for length, breadth and height in cm, based on the product type's typical real-world size and its visible proportions (e.g. a standard coffee mug is ~9.5 cm tall, ~8 cm wide without handle). Mark them approximate: true, source "estimated", verify: true, and fill Product Length/Breadth/Height with these numbers (no units in value; unit in Product Unit).
Weight: give a rough estimate only when the product type makes it reasonable; it is always verify: true.
Never leave a dimension empty just because it is not printed — an honest "~" estimate is what the seller needs. Never use placeholder words like "pending" or "TBD".

# Title
Structure: [Primary keyword] + [Key feature] + [Material/Style] + [Color] + [Pack quantity].
Clear, human-readable, no keyword stuffing, no unsupported claims. Include "Pack of N" when N > 1. Give up to 2 alternative titles.

# Description (max 1400 characters, plain text)
One-sentence overview, then short lines for key features, material, colour, quantity, dimensions (mark "approx."), care/use, pack contents. No claims the photo does not support.

# Keywords
5–10 natural search phrases buyers would type. Nothing misleading or unrelated.

# Shot plan ("shotPlan" — one entry for each of: primary, detail, size, lifestyle)
Write a precise image brief for each slot. Start every prompt with an exact visual description of THIS product (shape, colours, materials, logos, parts, proportions) so an image model can reproduce it faithfully. Then the composition:
- primary: single product, front/hero view, pure white background, fills ~85% of frame, no text, no props, no watermark.
- detail: different angle or close-up showing construction, texture or finish. Clean light background.
- size: single product with thin measurement lines for its main dimensions. Put 2–3 short labels in callouts, each a number with unit (e.g. "~9.5 cm", "~8 cm"), using "~" when estimated. Callouts must contain numbers — never words like "pending".
- lifestyle: the product in use in a realistic, tidy Indian home/everyday setting where it is normally used (e.g. a soap dish mounted on a tiled bathroom wall with a bar of soap). Product clearly visible and the hero of the image. If the seller gave a scene, use it.
If pack quantity > 1, the detail image may show the full pack; the primary image follows the same rule.

# Seller information
If the seller's notes or answers are provided, they are facts from the seller and override your visual guesses (pack size, variants, material, brand, use). Use them in fields, title and description. If the seller sells several variants (colours/sizes), mention them in the description and list them in a "Variants" field, but describe the photographed one in Color/Size.

# Verify list
"verifyBeforePublishing": only the facts the seller must check: actual weight, exact dimensions, HSN/GST if uncertain, manufacturer/packer/importer details, country of origin, MRP.

Write in simple English a first-time seller understands.`;

export type SellerContext = {
  notes?: string | null;
  answers?: SellerAnswer[];
  lifestyleScene?: string | null;
};

export function listingUserPrompt(imageCount: number, photoCount = 1, ctx: SellerContext = {}) {
  const photos =
    photoCount > 1
      ? `Here are ${photoCount} photos of the SAME single product from different angles (not ${photoCount} different products, and not a pack of ${photoCount} unless the photos clearly show several pieces together). Use all of them to judge shape, material, details and size.`
      : "Here is the product photo.";
  const lines = [`${photos} The seller wants ${imageCount} listing image${imageCount > 1 ? "s" : ""}. Return the complete listing.`];
  const answers = (ctx.answers ?? []).filter((a) => a.answer.trim());
  if (answers.length) lines.push("Seller's answers:\n" + answers.map((a) => `- ${a.question} → ${a.answer.trim()}`).join("\n"));
  if (ctx.notes?.trim()) lines.push(`Seller's notes: ${ctx.notes.trim()}`);
  if (ctx.lifestyleScene?.trim()) lines.push(`Seller's scene for the in-use (lifestyle) image: ${ctx.lifestyleScene.trim()}`);
  return lines.join("\n\n");
}

export const QUESTIONS_SYSTEM_PROMPT = `You help a first-time Meesho seller before their listing is written. Look at the product photo(s) and ask ONLY the questions whose answers would change the listing and cannot be seen in the photo.

Ask 2–5 short questions in simple English. Each must have 2–4 quick-pick options (most likely first). Good topics, only when unclear:
- Variants they sell (other colours / sizes / finishes) — always ask this one.
- Pieces per order (pack size).
- Material, if it can't be told from the photo.
- Brand (or "No brand / Generic").
- Main use, if the product could be used in different ways.
Never ask about price, stock, HSN, GST or manufacturer details.

Also suggest one realistic in-use photo setting for this product ("lifestyleScene"), e.g. "Mounted on a white-tiled bathroom wall with a bar of soap".`;

const SLOT_RULES: Record<Slot, string> = {
  primary:
    "PRIMARY MARKETPLACE IMAGE. Show the product alone, front/hero view, centred, filling about 85% of a square frame, on a pure white (#FFFFFF) seamless background with a soft natural shadow. No text, no labels, no props, no hands, no watermark, no border.",
  detail:
    "ANGLE / DETAIL IMAGE. Show the product from a different angle (three-quarter or side) or a close-up that reveals construction, texture and finish. Clean light-grey or white studio background. No text, no watermark.",
  size:
    "SIZE / FEATURES IMAGE. Show the product once, side-on, on a pure white background, with thin dark measurement lines and arrows along its main dimensions. Render ONLY the given labels next to the lines, in a clean sans-serif font. No other text, no watermark.",
  lifestyle:
    "IN-USE / LIFESTYLE IMAGE. Show the product being used in a realistic, clean, well-lit everyday setting. The product must be clearly visible, in focus and the main subject (about 40–60% of the frame). Natural props only where they explain the use. No text, no watermark, no people's faces.",
};

const FIDELITY_RULES =
  "Use the reference photo(s) as the ground truth. If there are several, they show the SAME single product from different angles — combine them to get every detail right, but still show it only once (or the stated pack). Reproduce the EXACT same product: same shape, proportions, colours, materials, texture, logo and parts. Do not add, remove or redesign anything. Exactly one product presentation in one image — never a collage, grid, split-screen or multiple panels. Photorealistic e-commerce product photography, even soft studio lighting, sharp focus.";

const ADJUST_PRIORITY =
  "This request has the HIGHEST priority. It overrides the framing, zoom, angle, background and composition rules above. It never allows changing the product itself.";

export function buildImagePrompt(details: ListingDetails, slot: Slot, adjust?: string, lifestyleScene?: string | null): string {
  const shot = details.shotPlan.find((s) => s.slot === slot);
  const parts: string[] = [];
  if (adjust?.trim()) parts.push(`SELLER'S REQUEST: ${adjust.trim()}\n${ADJUST_PRIORITY}`);
  parts.push(SLOT_RULES[slot], FIDELITY_RULES);
  if (shot?.prompt) parts.push(`Product and composition brief: ${shot.prompt}`);
  if (slot === "lifestyle" && lifestyleScene?.trim()) parts.push(`Setting chosen by the seller: ${lifestyleScene.trim()}`);
  if (details.summary.packQuantity > 1 && slot !== "size" && slot !== "lifestyle") {
    parts.push(`This is a pack of ${details.summary.packQuantity} — show all ${details.summary.packQuantity} identical pieces neatly arranged.`);
  }
  if (slot === "size") {
    // Only real measurements (must contain a digit) get rendered as text on the image.
    const labels = (shot?.callouts ?? []).map((l) => l.trim()).filter((l) => /\d/.test(l) && l.length <= 24).slice(0, 3);
    parts.push(labels.length ? `Labels to render: ${labels.map((l) => `"${l}"`).join(", ")}.` : "Draw the measurement lines without any text labels.");
  }
  if (adjust?.trim()) parts.push(`Remember the seller's request: ${adjust.trim()}`);
  return parts.join("\n\n");
}

/** Edit an existing generated image (sent as the FIRST image) instead of starting over. */
export function buildEditPrompt(slot: Slot, adjust: string): string {
  return [
    `EDIT THE FIRST IMAGE. The seller likes it and wants only this change: ${adjust.trim()}`,
    "Apply the requested change clearly — the result must look visibly different in exactly that way. Do NOT return the same image.",
    "Everything the seller did not ask to change stays the same: the product's shape, colours, material and details, and the overall style.",
    "The other images are the seller's real product photos. Use them only to keep the product accurate — do not copy their background or framing.",
    slot === "primary" ? "It must stay a clean pure-white-background product photo with no text." : "",
    "One image, no collage, no watermark.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const ZOOM_OUT = /zoom(ed)?\s*out|too\s*(close|zoom(ed)?)|very\s*zoom|less\s*zoom|more\s*(space|room|background)|further\s*away|smaller\s*in\s*(the)?\s*frame/i;
const ZOOM_IN = /zoom(ed)?\s*in|closer|too\s*far|bigger\s*in\s*(the)?\s*frame|fill\s*(more|the frame)/i;
// Anything that needs real image generation — then the AI handles the whole request.
const OTHER_CHANGE = /colou?r|light|shadow|background|angle|rotate|remove|add|replace|text|logo|bright|dark|warm|cool|sharp|blur|style|scene|prop|hand|reflection|shine|glossy|matte/i;

/**
 * Zoom-only requests are done exactly in code (no AI): returns the scale to apply, or null.
 * < 1 = zoom out, > 1 = zoom in.
 */
export function zoomScaleFor(adjust: string): number | null {
  const text = adjust.trim();
  if (!text || OTHER_CHANGE.test(text)) return null;
  const amount = /a\s*lot|much|way|very\s*much|double|half/i.test(text) ? 0.3 : /little|bit|slight|tad|small/i.test(text) ? 0.12 : 0.2;
  if (ZOOM_OUT.test(text)) return 1 - amount;
  if (ZOOM_IN.test(text)) return 1 + amount;
  return null;
}
