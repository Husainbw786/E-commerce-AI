"use client";

import { useState } from "react";
import { SLOT_INFO, type ProviderName, type Slot } from "@/lib/listing/schema";
import type { ImageDTO, ListingDTO } from "@/lib/listing/types";
import { Button, Icon, inputClass } from "../ui";
import { pickedImage, type Inflight } from "./use-image-orchestrator";

export const PROVIDER_LABEL: Record<ProviderName, string> = { openai: "OpenAI", gemini: "Gemini" };

type Props = {
  listing: ListingDTO;
  slot: Slot;
  index: number;
  inflight: Inflight[];
  onGenerate: (slot: Slot, provider: ProviderName, opts?: { adjust?: string; baseImageId?: string }) => void;
  onSelect: (img: ImageDTO) => void;
  onDelete: (img: ImageDTO) => void;
};

/**
 * One image slot with every version kept (newest first) until the seller deletes it.
 * "Apply change" edits the picked version; "New version" starts again from the photos.
 */
export function ImageSlot({ listing, slot, index, inflight, onGenerate, onSelect, onDelete }: Props) {
  const [adjust, setAdjust] = useState("");
  const picked = pickedImage(listing.images, slot);

  const versions = listing.images
    .filter((i) => i.slot === slot)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((img, i) => ({ img, n: i + 1 }))
    .reverse();
  const pending = inflight.filter((r) => r.slot === slot);
  const others = listing.availableProviders.filter((p) => p !== listing.provider);
  const doneCount = versions.filter((v) => v.img.status === "done").length;
  const busy = pending.length > 0;

  function applyChange() {
    if (!picked || !adjust.trim()) return;
    onGenerate(slot, picked.provider, { adjust, baseImageId: picked.id });
  }

  return (
    <section className="border-b-2 border-line py-6 first:pt-0">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-accent-strong">0{index + 1}</span>
        <h3 className="m-0 text-lg font-extrabold">{SLOT_INFO[slot].name}</h3>
        <span className="text-[13px] text-muted">{SLOT_INFO[slot].desc}</span>
        {slot === "lifestyle" && listing.lifestyleScene && <span className="text-[13px] text-ink-2">· Scene: {listing.lifestyleScene}</span>}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-0.5 border-2 border-line bg-line">
        {pending.map((r) => (
          <div key={r.id} className="flex min-w-0 flex-col bg-paper">
            <div className="busy relative flex aspect-square items-end p-3">
              <span className="bg-paper/90 px-2 py-1 text-xs font-semibold text-accent-strong">
                {r.edit ? "Applying your change" : "Generating"} with {PROVIDER_LABEL[r.provider]}…
              </span>
            </div>
            <div className="px-3.5 pb-3.5 pt-3 text-[13px] text-muted">{r.adjust ? `“${r.adjust}”` : "New version"}</div>
          </div>
        ))}
        {versions.map(({ img, n }) => (
          <Version
            key={img.id}
            listingId={listing.id}
            img={img}
            n={n}
            isPicked={picked?.id === img.id}
            showPick={doneCount > 1}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
        {!pending.length && !versions.length && <div className="striped aspect-square" />}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <label htmlFor={`adjust-${slot}`} className="mb-1 block text-xs text-ink-2">
            Change the {picked ? `selected image (v${versions.find((v) => v.img.id === picked.id)?.n})` : "image"}
          </label>
          <input
            id={`adjust-${slot}`}
            value={adjust}
            maxLength={300}
            onChange={(e) => setAdjust(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyChange()}
            placeholder="e.g. zoom out a little, softer shadow, show the back"
            className={inputClass}
          />
        </div>
        <Button variant="primary" disabled={!picked || !adjust.trim()} onClick={applyChange} title="Edits the selected image and keeps the original">
          Apply change
        </Button>
        <Button disabled={busy} onClick={() => onGenerate(slot, listing.provider, { adjust })} title="Makes a fresh image from your photos">
          <Icon name="refresh" size={13} /> New version
        </Button>
        {others.map((p) => (
          <Button key={p} variant="ghost" onClick={() => onGenerate(slot, p, { adjust })}>
            Try with {PROVIDER_LABEL[p]}
          </Button>
        ))}
      </div>
    </section>
  );
}

function Version(props: {
  listingId: string;
  img: ImageDTO;
  n: number;
  isPicked: boolean;
  showPick: boolean;
  onSelect: (img: ImageDTO) => void;
  onDelete: (img: ImageDTO) => void;
}) {
  const { img, n } = props;
  const ready = img.status === "done" && img.url;

  return (
    <div className={`flex min-w-0 flex-col bg-paper ${props.isPicked && props.showPick ? "outline-2 -outline-offset-2 outline-accent" : ""}`}>
      <div className="relative aspect-square bg-white">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url!} alt={`Version ${n}`} className="absolute inset-0 size-full object-contain" />
        ) : img.status === "pending" ? (
          <div className="busy absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-start justify-end gap-1 bg-accent-soft p-4">
            <span className="text-sm font-extrabold text-accent-ink">Couldn&apos;t generate</span>
            <span className="text-[13px] text-accent-ink">{img.error}</span>
          </div>
        )}
        <span className="absolute left-2 top-2 bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-paper">v{n}</span>
      </div>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[14px] font-extrabold">{PROVIDER_LABEL[img.provider]}</span>
          <span className="truncate font-mono text-[11px] text-muted">{img.baseImageId ? "edited" : img.model}</span>
        </div>
        {img.adjust && <div className="line-clamp-2 text-xs text-ink-2">“{img.adjust}”</div>}
        <div className="flex gap-2">
          {props.showPick && ready && (
            <Button
              variant={props.isPicked ? "primary" : "outline"}
              aria-pressed={props.isPicked}
              onClick={() => props.onSelect(img)}
              className="flex-1 justify-center px-2.5 py-[7px] text-xs"
            >
              {props.isPicked ? (
                <>
                  <Icon name="check" size={13} /> Selected
                </>
              ) : (
                "Use this"
              )}
            </Button>
          )}
          {ready && (
            <a
              href={`/api/listings/${props.listingId}/images/${img.id}`}
              aria-label={`Download version ${n}`}
              className="inline-flex h-8 w-[34px] items-center justify-center border border-line text-ink hover:bg-ink/[0.07] hover:text-ink"
            >
              <Icon name="download" size={14} />
            </a>
          )}
          <button
            type="button"
            aria-label={`Delete version ${n}`}
            title="Delete this version"
            onClick={() => {
              if (img.status !== "done" || confirm(`Delete version ${n}? This can't be undone.`)) props.onDelete(img);
            }}
            className="ml-auto inline-flex h-8 w-[34px] cursor-pointer items-center justify-center border border-line bg-transparent text-ink hover:border-accent hover:text-accent"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
