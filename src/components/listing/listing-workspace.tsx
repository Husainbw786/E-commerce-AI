"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeListing, selectImage, updateListing } from "@/lib/client/api";
import { listingToText } from "@/lib/listing/export";
import { slotsFor, type ListingPatch } from "@/lib/listing/schema";
import type { ImageDTO, ListingDTO } from "@/lib/listing/types";
import { useToast } from "../toast";
import { Button, Icon, StepsBar, Tag } from "../ui";
import { ExportDialog } from "./export-dialog";
import { ImageSlot, PROVIDER_LABEL } from "./image-slot";
import { ListingDetailsPanel } from "./listing-details";
import { keyOf, latestImage, useImageOrchestrator } from "./use-image-orchestrator";

export function ListingWorkspace({ initial }: { initial: ListingDTO }) {
  const router = useRouter();
  const toast = useToast();
  const { listing, setListing, inflight, requestErrors, run } = useImageOrchestrator(initial);
  const [exportOpen, setExportOpen] = useState(false);

  const slots = slotsFor(listing.imageCount);
  const details = listing.details;

  if (listing.status === "failed" || (!details && listing.status !== "analysing")) {
    return (
      <>
        <StepsBar active={0} />
        <main className="mx-auto max-w-[720px] px-6 pb-14 pt-10">
          <Tag tone="accent">Couldn&apos;t read this photo</Tag>
          <h1 className="mb-2 mt-3 text-[clamp(28px,4.5vw,40px)] font-extrabold leading-[1.08] tracking-[-0.02em]">Let&apos;s try another photo</h1>
          <p className="text-muted">{listing.error ?? "The AI could not identify the product."} Use a clear photo with one product in frame and even light.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 bg-accent px-4 py-3 font-extrabold text-paper no-underline hover:bg-accent-hover hover:text-paper">
            Upload a new photo <Icon name="arrow" />
          </Link>
        </main>
      </>
    );
  }

  if (!details) {
    return (
      <>
        <StepsBar active={1} />
        <main className="mx-auto max-w-[1040px] px-6 pb-14 pt-10">
          <h1 className="mb-2 text-[clamp(28px,4.5vw,40px)] font-extrabold leading-[1.08] tracking-[-0.02em]">Reading your product…</h1>
          <p className="text-muted">Writing the title, description and Meesho fields. This takes about 20 seconds.</p>
          <div className="busy mt-6 h-1.5" />
        </main>
      </>
    );
  }

  // Progress over the images we expect to exist.
  const expected = slots.map((slot) => ({ slot, p: listing.provider }));
  const finished = expected.filter(({ slot, p }) => {
    const img = latestImage(listing.images, slot, p);
    return !inflight.has(keyOf(slot, p)) && img && img.status !== "pending";
  }).length;
  const generating = inflight.size > 0 || listing.images.some((i) => i.status === "pending");
  const readySlots = slots.filter((slot) => listing.images.some((i) => i.slot === slot && i.status === "done")).length;

  async function save(patch: ListingPatch) {
    try {
      const fresh = await updateListing(listing.id, patch);
      setListing((l) => ({ ...l, details: fresh.details, sku: fresh.sku }));
      toast("Saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  async function choose(img: ImageDTO) {
    setListing((l) => ({ ...l, images: l.images.map((i) => (i.slot === img.slot ? { ...i, selected: i.id === img.id } : i)) }));
    try {
      await selectImage(listing.id, img.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't select image");
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(listingToText(details!, slots));
      toast("All listing details copied");
    } catch {
      toast("Couldn't copy — use Export instead.");
    }
  }

  async function destroy() {
    if (!confirm("Delete this listing and its images? This can't be undone.")) return;
    try {
      await removeListing(listing.id);
      router.push("/library");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <>
      <StepsBar active={generating ? 1 : 2} />
      <main className="mx-auto max-w-[1240px] px-6 pb-14 pt-8">
        <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="mr-auto min-w-0">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <Tag tone="accent">
                {readySlots} of {slots.length} image{slots.length > 1 ? "s" : ""} ready
              </Tag>
              <Tag>Meesho</Tag>
              <Tag>Images: {PROVIDER_LABEL[listing.provider]}</Tag>
              <Tag>{details.summary.category}</Tag>
              {details.summary.packQuantity > 1 && <Tag>Pack of {details.summary.packQuantity}</Tag>}
            </div>
            <h1 className="m-0 text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.1] tracking-[-0.02em] [text-wrap:pretty]">{details.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyAll}>
              <Icon name="copy" /> Copy all details
            </Button>
            <Button variant="primary" onClick={() => setExportOpen(true)} disabled={readySlots === 0}>
              Export listing <Icon name="arrow" />
            </Button>
          </div>
        </div>

        {details.confidence === "low" && (
          <div role="status" className="mb-6 border-l-4 border-accent bg-accent-soft p-4 text-sm text-accent-ink">
            The AI wasn&apos;t sure what this product is. Check every field carefully, or try a clearer photo.
          </div>
        )}

        {generating && (
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm text-muted">
              <span>Generating images — they appear as soon as each one is ready.</span>
              <span>
                {finished}/{expected.length}
              </span>
            </div>
            <div className="h-1.5 bg-track">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${expected.length ? (finished / expected.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <div className="mb-12 grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Your photo{listing.sourceUrls.length > 1 ? `s (${listing.sourceUrls.length})` : ""}
            </div>
            <div className="relative aspect-square max-w-[240px] border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={listing.sourceUrls[0]} alt="Main product photo" className="absolute inset-0 size-full object-contain p-3" />
            </div>
            {listing.sourceUrls.length > 1 && (
              <div className="mt-2 grid max-w-[240px] grid-cols-4 gap-1.5">
                {listing.sourceUrls.slice(1).map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="relative block aspect-square border border-line bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Product photo ${i + 2}`} className="absolute inset-0 size-full object-contain p-1" />
                  </a>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted">AI images are based on these photos. Make sure they match your real product before publishing.</p>
          </aside>
          <div className="min-w-0">
            {slots.map((slot, i) => (
              <ImageSlot
                key={slot}
                listing={listing}
                slot={slot}
                index={i}
                inflight={inflight}
                requestErrors={requestErrors}
                onRegenerate={run}
                onSelect={choose}
              />
            ))}
          </div>
        </div>

        <ListingDetailsPanel details={details} onSave={save} />

        <div className="mt-12 flex justify-end border-t border-line pt-4">
          <Button variant="ghost" onClick={destroy}>
            <Icon name="trash" size={13} /> Delete listing
          </Button>
        </div>
      </main>
      {exportOpen && <ExportDialog listing={listing} onClose={() => setExportOpen(false)} />}
    </>
  );
}
