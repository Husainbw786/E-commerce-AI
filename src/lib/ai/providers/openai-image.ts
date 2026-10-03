import "server-only";
import { toFile } from "openai";
import { env } from "@/lib/env";
import { openai } from "../openai-text";
import type { ImageProvider } from "./types";

// gpt-image-2+ keep input detail on their own and reject this parameter.
const supportsInputFidelity = (model: string) => /^gpt-image-1/.test(model);

export function openaiImageProvider(): ImageProvider {
  const model = env().OPENAI_IMAGE_MODEL;
  return {
    name: "openai",
    model,
    async generate({ referenceImages, prompt }) {
      const result = await openai().images.edit({
        model,
        image: await Promise.all(referenceImages.map((img, i) => toFile(img, `product-${i + 1}.jpg`, { type: "image/jpeg" }))),
        prompt,
        size: "1024x1024",
        quality: env().OPENAI_IMAGE_QUALITY,
        ...(supportsInputFidelity(model) ? { input_fidelity: "high" as const } : {}),
        background: "opaque",
        output_format: "png",
        n: 1,
      });
      const b64 = result.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI returned no image");
      return { image: Buffer.from(b64, "base64"), usage: result.usage ?? null };
    },
  };
}
