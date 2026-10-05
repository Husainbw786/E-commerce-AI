import type { ListingDetails, ProviderName, SellerAnswer, Slot } from "./schema";

/** Shapes the API returns to the browser. */
export type ImageDTO = {
  id: string;
  slot: Slot;
  provider: ProviderName;
  model: string;
  url: string | null;
  status: "pending" | "done" | "failed";
  error: string | null;
  selected: boolean;
  adjust: string | null;
  baseImageId: string | null;
  createdAt: string;
  /** Sum of AI calls that produced this version (null if unpriced). */
  costUsd: number | null;
};

export type ModelOptionDTO = {
  id: string;
  provider: ProviderName;
  label: string;
  blurb: string;
  /** Typical cost of one image: official price (Gemini) or the average of the seller's own images. */
  estimateUsd: number | null;
  estimateSource: "official" | "yours" | null;
  /** Average generation time from the seller's own images. */
  avgSeconds: number | null;
};

export type UsageDTO = {
  id: string;
  purpose: "questions" | "listing" | "image" | "edit" | string;
  provider: string;
  model: string;
  imageId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  ms: number | null;
  ok: boolean;
  createdAt: string;
};

export type ListingDTO = {
  id: string;
  sourceUrl: string;
  sourceUrls: string[];
  imageCount: number;
  /** Image slots for this listing, in order (standard slots + optional lifestyle). */
  slots: Slot[];
  lifestyle: boolean;
  lifestyleScene: string | null;
  sellerNotes: string | null;
  sellerAnswers: SellerAnswer[];
  status: "analysing" | "ready" | "failed";
  details: ListingDetails | null;
  error: string | null;
  sku: string | null;
  createdAt: string;
  images: ImageDTO[];
  /** Image model chosen at upload — the only one that runs automatically. */
  imageModel: string;
  /** Models the seller can pick from for new versions. */
  models: ModelOptionDTO[];
  /** Every AI call for this listing, including deleted image versions. */
  usage: { totalUsd: number; events: UsageDTO[] };
  usdToInr: number | null;
};

export type ListingSummaryDTO = {
  id: string;
  title: string;
  sourceUrl: string;
  imageCount: number;
  status: ListingDTO["status"];
  createdAt: string;
  coverUrl: string | null;
  costUsd: number;
};
