"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/ai/pricing";
import { SLOT_INFO } from "@/lib/listing/schema";
import type { ListingDTO, UsageDTO } from "@/lib/listing/types";
import { SectionHeading } from "../ui";

const PURPOSE_LABEL: Record<string, string> = {
  questions: "Questions before listing",
  listing: "Listing details",
  image: "Image",
  edit: "Image edit",
};

function describe(e: UsageDTO, listing: ListingDTO): string {
  const base = PURPOSE_LABEL[e.purpose] ?? e.purpose;
  if (!e.imageId) return base;
  const img = listing.images.find((i) => i.id === e.imageId);
  if (!img) return `${base} (deleted version)`;
  const versions = listing.images
    .filter((i) => i.slot === img.slot)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const n = versions.findIndex((i) => i.id === img.id) + 1;
  return `${base} · ${SLOT_INFO[img.slot].name} v${n}`;
}

const tokens = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-IN"));

/** Every AI call made for this listing, with tokens and cost. Includes deleted versions — they were still paid for. */
export function CostPanel({ listing }: { listing: ListingDTO }) {
  const [open, setOpen] = useState(false);
  const { events, totalUsd } = listing.usage;
  const rate = listing.usdToInr;
  const failed = events.filter((e) => !e.ok).length;
  const unpriced = events.some((e) => e.ok && e.costUsd === null);

  return (
    <section className="mt-12">
      <SectionHeading
        num="$"
        title="AI cost"
        right={<span className="text-base font-extrabold">{formatUsd(totalUsd, rate)}</span>}
      />
      <p className="-mt-2 mb-3 text-[13px] text-muted">
        {events.length} AI call{events.length === 1 ? "" : "s"} for this listing
        {failed ? ` (${failed} failed, not charged)` : ""}. Includes versions you deleted. Based on standard API prices.
        {unpriced && " Some models have no price set, so the total is a minimum."}
      </p>
      <button type="button" onClick={() => setOpen((o) => !o)} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-extrabold text-accent-strong">
        {open ? "Hide breakdown" : "Show breakdown"}
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr>
                {["What", "Model", "Tokens in", "Tokens out", "Time", "Cost"].map((h, i) => (
                  <th
                    key={h}
                    className={`border-b-2 border-line p-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted ${i >= 2 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className={e.ok ? "" : "text-muted"}>
                  <td className="border-b border-line p-2">
                    {describe(e, listing)}
                    {!e.ok && <span className="ml-2 text-[11px] text-accent-ink">failed</span>}
                  </td>
                  <td className="border-b border-line p-2 font-mono text-[12px]">{e.model}</td>
                  <td className="border-b border-line p-2 text-right">{tokens(e.inputTokens)}</td>
                  <td className="border-b border-line p-2 text-right">{tokens(e.outputTokens)}</td>
                  <td className="border-b border-line p-2 text-right">{e.ms ? `${(e.ms / 1000).toFixed(1)}s` : "—"}</td>
                  <td className="border-b border-line p-2 text-right font-semibold">{formatUsd(e.costUsd, rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
