import type { ListingPatch, ProviderName, SellerAnswer, SellerQuestions, Slot } from "@/lib/listing/schema";
import type { ImageDTO, ListingDTO } from "@/lib/listing/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

const json = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function uploadPhoto(file: Blob, name: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, name);
  const { url } = await request<{ url: string }>("/api/upload", { method: "POST", body: form });
  return url;
}

export type CreateListingInput = {
  sourceUrls: string[];
  imageCount: number;
  provider: ProviderName;
  notes?: string;
  answers?: SellerAnswer[];
  lifestyle?: boolean;
  lifestyleScene?: string;
};

export async function createListing(input: CreateListingInput) {
  return (await request<{ listing: ListingDTO }>("/api/listings", json(input))).listing;
}

export async function fetchQuestions(sourceUrls: string[], notes?: string) {
  return (await request<{ questions: SellerQuestions }>("/api/questions", json({ sourceUrls, notes: notes || undefined }))).questions;
}

export async function deleteImage(id: string, imageId: string) {
  return (await request<{ listing: ListingDTO }>(`/api/listings/${id}/images/${imageId}`, { method: "DELETE" })).listing;
}

export async function fetchListing(id: string) {
  return (await request<{ listing: ListingDTO }>(`/api/listings/${id}`)).listing;
}

export async function updateListing(id: string, patch: ListingPatch) {
  return (await request<{ listing: ListingDTO }>(`/api/listings/${id}`, json(patch, "PATCH"))).listing;
}

export async function removeListing(id: string) {
  await request<void>(`/api/listings/${id}`, { method: "DELETE" });
}

export async function generateImage(id: string, slot: Slot, provider: ProviderName, opts: { adjust?: string; baseImageId?: string } = {}) {
  return (
    await request<{ image: ImageDTO }>(
      `/api/listings/${id}/images`,
      json({ slot, provider, adjust: opts.adjust?.trim() || undefined, baseImageId: opts.baseImageId }),
    )
  ).image;
}

export async function selectImage(id: string, imageId: string) {
  return (await request<{ listing: ListingDTO }>(`/api/listings/${id}/images/${imageId}`, json({ selected: true }, "PATCH"))).listing;
}
