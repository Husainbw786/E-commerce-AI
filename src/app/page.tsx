import { UploadStudio } from "@/components/upload-studio";
import { defaultImageModel } from "@/lib/ai/providers";
import { env } from "@/lib/env";
import { modelOptions } from "@/lib/listing/models-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <UploadStudio models={await modelOptions()} defaultModel={defaultImageModel()} usdToInr={env().USD_TO_INR ?? null} />;
}
