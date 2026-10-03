import type { ListingDetails, ProviderName, Slot } from "./schema";

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
  createdAt: string;
};

export type ListingDTO = {
  id: string;
  sourceUrl: string;
  imageCount: number;
  status: "analysing" | "ready" | "failed";
  details: ListingDetails | null;
  error: string | null;
  sku: string | null;
  createdAt: string;
  images: ImageDTO[];
  plan: { mode: "dual" | "fallback"; providers: ProviderName[] };
};

export type ListingSummaryDTO = {
  id: string;
  title: string;
  sourceUrl: string;
  imageCount: number;
  status: ListingDTO["status"];
  createdAt: string;
  coverUrl: string | null;
};
