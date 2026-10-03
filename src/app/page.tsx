import { UploadStudio } from "@/components/upload-studio";
import { imagePlan } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export default function Home() {
  return <UploadStudio mode={imagePlan().mode} />;
}
