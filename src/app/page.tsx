import { UploadStudio } from "@/components/upload-studio";
import { availableProviders, defaultProvider } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export default function Home() {
  return <UploadStudio providers={availableProviders()} defaultProvider={defaultProvider()} />;
}
