import type { ProviderName } from "@/lib/listing/schema";

export type ImageRequest = {
  /** Seller's product photos (JPEG), first = main view. */
  referenceImages: Buffer[];
  prompt: string;
};

export type ImageResult = { image: Buffer; usage: unknown };

export interface ImageProvider {
  name: ProviderName;
  model: string;
  generate(req: ImageRequest): Promise<ImageResult>;
}
