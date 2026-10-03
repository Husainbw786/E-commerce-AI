import Link from "next/link";
import { Icon, Tag } from "@/components/ui";
import { listListings } from "@/lib/listing/service";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function LibraryPage() {
  const rows = await listListings();
  return (
    <main className="mx-auto max-w-[1240px] px-6 pb-14 pt-8">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="m-0 mb-1.5 text-[clamp(28px,4.5vw,40px)] font-extrabold leading-[1.08] tracking-[-0.02em]">Library</h1>
          <p className="m-0 text-[15px] text-muted">Every product you&apos;ve generated. Open one to download or export again.</p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2.5 bg-accent px-3.5 py-2.5 text-[13px] font-extrabold text-paper no-underline hover:bg-accent-hover hover:text-paper">
          New product <Icon name="plus" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center">
          <p className="m-0 mb-3 text-muted">No listings yet.</p>
          <Link href="/" className="font-extrabold">
            Create your first listing
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                {["Product", "Images", "Created", "Status", ""].map((h) => (
                  <th key={h} className="border-b-2 border-line p-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ink/[0.04]">
                  <td className="border-b border-line px-2 py-3">
                    <Link href={`/listing/${r.id}`} className="flex items-center gap-3 text-ink no-underline hover:text-ink">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.coverUrl ?? r.sourceUrl} alt="" className="size-10 flex-none border border-line bg-white object-contain" />
                      <span className="font-semibold">{r.title}</span>
                    </Link>
                  </td>
                  <td className="border-b border-line px-2 py-3">{r.imageCount}</td>
                  <td className="border-b border-line px-2 py-3 text-muted">{dateFmt.format(new Date(r.createdAt))}</td>
                  <td className="border-b border-line px-2 py-3">
                    <Tag tone={r.status === "ready" ? "accent" : "neutral"}>{r.status === "ready" ? "Ready" : r.status === "failed" ? "Failed" : "Analysing"}</Tag>
                  </td>
                  <td className="border-b border-line px-2 py-3 text-right">
                    <Link href={`/listing/${r.id}`} className="text-[13px] font-extrabold no-underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
