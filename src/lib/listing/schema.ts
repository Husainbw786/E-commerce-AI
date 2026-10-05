import { z } from "zod";

/**
 * Shared by the AI (Structured Outputs), the API and the UI.
 * Keep it free of min/max constraints: OpenAI strict mode rejects some of them,
 * so limits are enforced in `postprocess.ts` instead.
 */

export const SLOTS = ["primary", "detail", "size", "lifestyle"] as const;
export type Slot = (typeof SLOTS)[number];
/** The 1–3 images picked by count. "lifestyle" is an optional extra. */
export const STANDARD_SLOTS = ["primary", "detail", "size"] as const satisfies readonly Slot[];

export const PROVIDERS = ["openai", "gemini"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export const FieldSource = z.enum(["visible", "estimated", "unknown"]);
export type FieldSource = z.infer<typeof FieldSource>;

export const ListingField = z.object({
  key: z.string().describe("snake_case id, e.g. product_name, hsn_code, net_quantity"),
  label: z.string().describe("Exact Meesho field label, e.g. 'Product Name'"),
  value: z.string().describe("Short copy-paste value. Empty string if unknown."),
  note: z.string().nullable().describe("Short caveat or dropdown hint, or null"),
  source: FieldSource,
  verify: z.boolean().describe("true if the seller must check this before publishing"),
});
export type ListingField = z.infer<typeof ListingField>;

export const Measurement = z.object({
  name: z.string().describe("e.g. 'Total length', 'Product weight'"),
  value: z.number().nullable(),
  unit: z.enum(["cm", "in", "mm", "g", "kg", "ml", "l"]),
  approximate: z.boolean(),
});
export type Measurement = z.infer<typeof Measurement>;

export const ShotPlanItem = z.object({
  slot: z.enum(SLOTS),
  prompt: z
    .string()
    .describe("Image brief for this slot: exact product description + composition. No collage."),
  callouts: z
    .array(z.string())
    .describe("Only for the size slot: 2-3 very short labels (e.g. '~22 cm'). Empty for others."),
});
export type ShotPlanItem = z.infer<typeof ShotPlanItem>;

export const ListingDetails = z.object({
  summary: z.object({
    product: z.string(),
    category: z.string().describe("Meesho-style category path, e.g. 'Home & Kitchen > Knives'"),
    intendedUse: z.string(),
    packQuantity: z.number().int().describe("Pieces a customer receives in one order"),
    color: z.string(),
    material: z.string(),
    brand: z.string().describe("'Generic' unless a brand is clearly visible"),
  }),
  fields: z.array(ListingField),
  measurements: z.array(Measurement),
  title: z.string(),
  altTitles: z.array(z.string()),
  description: z.string(),
  keywords: z.array(z.string()),
  shotPlan: z.array(ShotPlanItem),
  verifyBeforePublishing: z.array(z.string()),
  assumptions: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]).describe("How confidently the product was identified"),
});
export type ListingDetails = z.infer<typeof ListingDetails>;

/** What the client may send when editing a listing. */
export const ListingPatch = z.object({
  title: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  keywords: z.array(z.string().max(100)).max(20).optional(),
  fields: z
    .array(z.object({ key: z.string(), value: z.string().max(1000) }))
    .max(80)
    .optional(),
  sku: z.string().max(60).optional(),
  lifestyle: z.boolean().optional(),
  lifestyleScene: z.string().max(300).optional(),
});
export type ListingPatch = z.infer<typeof ListingPatch>;

export const MAX_SOURCE_PHOTOS = 4;

export const SellerAnswer = z.object({ question: z.string().max(300), answer: z.string().max(300) });
export type SellerAnswer = z.infer<typeof SellerAnswer>;

export const CreateListingBody = z.object({
  sourceUrls: z.array(z.string().min(1).max(2000)).min(1).max(MAX_SOURCE_PHOTOS),
  imageCount: z.number().int().min(1).max(3),
  /** Image model id, e.g. "gemini-3.1-flash-image". */
  model: z.string().min(1).max(80),
  notes: z.string().max(1000).optional(),
  answers: z.array(SellerAnswer).max(10).optional(),
  lifestyle: z.boolean().optional(),
  lifestyleScene: z.string().max(300).optional(),
  questionsUsageId: z.string().uuid().optional(),
});

export const QuestionsBody = z.object({
  sourceUrls: z.array(z.string().min(1).max(2000)).min(1).max(MAX_SOURCE_PHOTOS),
  notes: z.string().max(1000).optional(),
});

/** What the AI asks before writing the listing. */
export const SellerQuestions = z.object({
  productGuess: z.string().describe("Short name of what the product looks like, e.g. 'Wall-mounted soap dish'"),
  questions: z.array(
    z.object({
      id: z.string().describe("short snake_case id"),
      question: z.string().describe("Short, simple question for a first-time seller"),
      options: z.array(z.string()).describe("2-4 quick-pick answers; the first is the most likely"),
    }),
  ),
  lifestyleScene: z
    .string()
    .describe("One-line suggestion for an in-use photo setting, e.g. 'Mounted on a white-tiled bathroom wall with a bar of soap'"),
});
export type SellerQuestions = z.infer<typeof SellerQuestions>;

export const GenerateImageBody = z.object({
  slot: z.enum(SLOTS),
  model: z.string().min(1).max(80),
  adjust: z.string().max(300).optional(),
  /** Edit this existing image instead of generating from the original photos. */
  baseImageId: z.string().uuid().optional(),
});

export function slotsFor(count: number, lifestyle = false): Slot[] {
  const slots: Slot[] = STANDARD_SLOTS.slice(0, Math.max(1, Math.min(3, count)));
  return lifestyle ? [...slots, "lifestyle"] : slots;
}

export const SLOT_INFO: Record<Slot, { name: string; desc: string }> = {
  primary: { name: "Primary image", desc: "Product alone on pure white. No text, no props." },
  detail: { name: "Angle / detail", desc: "A different angle or close-up of texture and finish." },
  size: { name: "Size & features", desc: "One product with measurement lines or short callouts." },
  lifestyle: { name: "In use", desc: "The product in a real setting, like a soap dish on a bathroom wall." },
};
