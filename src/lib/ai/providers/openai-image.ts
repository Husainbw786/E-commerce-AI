import "server-only";
import { toFile } from "openai";
import { env } from "@/lib/env";
import { openai } from "../openai-text";
import type { ImageProvider } from "./types";

// Optional settings some GPT image models reject. When the API says a parameter isn't supported,
// we drop it and retry instead of failing (e.g. gpt-image-2.5 rejects input_fidelity).
const OPTIONAL_PARAMS = ["input_fidelity", "background", "quality", "output_format"] as const;
type OptionalParam = (typeof OPTIONAL_PARAMS)[number];

function unsupportedParam(err: unknown): OptionalParam | null {
  const msg = err instanceof Error ? err.message : String(err);
  return OPTIONAL_PARAMS.find((p) => msg.includes(`'${p}'`) || msg.includes(`"${p}"`) || new RegExp(`\\b${p}\\b.*not supported|not support.*\\b${p}\\b`, "i").test(msg)) ?? null;
}

export function openaiImageProvider(model: string): ImageProvider {
  return {
    name: "openai",
    model,
    async generate({ referenceImages, prompt }) {
      const optional: Partial<Record<OptionalParam, string>> = {
        input_fidelity: "high",
        background: "opaque",
        quality: env().OPENAI_IMAGE_QUALITY,
        output_format: "png",
      };
      const images = await Promise.all(referenceImages.map((img, i) => toFile(img, `product-${i + 1}.jpg`, { type: "image/jpeg" })));

      for (let attempt = 0; ; attempt++) {
        try {
          const result = await openai().images.edit({
            model,
            image: images,
            prompt,
            size: "1024x1024",
            n: 1,
            ...(optional as object),
          });
          const b64 = result.data?.[0]?.b64_json;
          if (!b64) throw new Error("OpenAI returned no image");
          return { image: Buffer.from(b64, "base64"), usage: result.usage ?? null };
        } catch (err) {
          const param = unsupportedParam(err);
          if (!param || !(param in optional) || attempt >= OPTIONAL_PARAMS.length) throw err;
          delete optional[param];
        }
      }
    },
  };
}
