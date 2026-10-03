import { notFound } from "next/navigation";
import { ListingWorkspace } from "@/components/listing/listing-workspace";
import { HttpError } from "@/lib/http";
import { getListing } from "@/lib/listing/service";

export const dynamic = "force-dynamic";

export default async function ListingPage(props: PageProps<"/listing/[id]">) {
  const { id } = await props.params;
  const listing = await getListing(id).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  return <ListingWorkspace key={listing.id} initial={listing} />;
}
