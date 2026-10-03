import type { ProviderName } from "@/lib/listing/schema";

export type ImageRequest = {
  /** Original product photo (JPEG). */
  referenceImage: Buffer;
  prompt: string;
};

export type ImageResult = { image: Buffer; usage: unknown };

export interface ImageProvider {
  name: ProviderName;
  model: string;
  generate(req: ImageRequest): Promise<ImageResult>;
}
