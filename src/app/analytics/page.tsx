import { Tag } from "@/components/ui";

export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-6 pb-14 pt-8">
      <Tag tone="accent">Coming later</Tag>
      <h1 className="mb-2 mt-3 text-[clamp(28px,4.5vw,40px)] font-extrabold leading-[1.08] tracking-[-0.02em]">Analytics</h1>
      <p className="mb-7 max-w-[60ch] text-[15px] text-muted">Listing views, conversion and image performance will show here once your Meesho seller account is connected.</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-0.5 border-2 border-line bg-line">
        {["Listing views", "Orders", "Image click-through"].map((a) => (
          <div key={a} className="flex min-h-[220px] flex-col gap-3 bg-paper p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{a}</div>
            <div className="flex-1 border border-dashed border-line" />
          </div>
        ))}
      </div>
    </main>
  );
}
