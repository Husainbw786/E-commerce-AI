"use client";

import { useState } from "react";
import { SLOT_INFO, type ProviderName, type Slot } from "@/lib/listing/schema";
import type { ImageDTO, ListingDTO } from "@/lib/listing/types";
import { Button, Icon, inputClass } from "../ui";
import { keyOf, latestImage, pickedImage } from "./use-image-orchestrator";

export const PROVIDER_LABEL: Record<ProviderName, string> = { openai: "OpenAI", gemini: "Gemini" };

type Props = {
  listing: ListingDTO;
  slot: Slot;
  index: number;
  inflight: Set<string>;
  requestErrors: Record<string, string>;
  onRegenerate: (slot: Slot, provider: ProviderName, adjust?: string) => void;
  onSelect: (img: ImageDTO) => void;
};

export function ImageSlot({ listing, slot, index, inflight, requestErrors, onRegenerate, onSelect }: Props) {
  const [adjust, setAdjust] = useState("");
  const picked = pickedImage(listing.images, slot);

  // The chosen model always has a card; another model appears once the seller tries it.
  const providers = [listing.provider, ...listing.availableProviders.filter((p) => p !== listing.provider)];
  const shown = providers.filter((p) => p === listing.provider || latestImage(listing.images, slot, p) || inflight.has(keyOf(slot, p)));
  const untried = listing.availableProviders.filter((p) => !shown.includes(p));
  const anyBusy = shown.some((p) => inflight.has(keyOf(slot, p)));

  return (
    <section className="border-b-2 border-line py-6 first:pt-0">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-accent-strong">0{index + 1}</span>
        <h3 className="m-0 text-lg font-extrabold">{SLOT_INFO[slot].name}</h3>
        <span className="text-[13px] text-muted">{SLOT_INFO[slot].desc}</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-0.5 border-2 border-line bg-line">
        {shown.map((p) => (
          <Candidate
            key={p}
            listingId={listing.id}
            provider={p}
            image={latestImage(listing.images, slot, p)}
            busy={inflight.has(keyOf(slot, p))}
            requestError={requestErrors[keyOf(slot, p)]}
            isPicked={!!picked && picked.id === latestImage(listing.images, slot, p)?.id}
            showPick={shown.length > 1}
            onSelect={onSelect}
            onRegenerate={() => onRegenerate(slot, p, adjust)}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label htmlFor={`adjust-${slot}`} className="mb-1 block text-xs text-ink-2">
            Adjust this image (optional)
          </label>
          <input
            id={`adjust-${slot}`}
            value={adjust}
            maxLength={300}
            onChange={(e) => setAdjust(e.target.value)}
            placeholder="e.g. show the handle more clearly, softer shadow"
            className={inputClass}
          />
        </div>
        <Button disabled={anyBusy} onClick={() => shown.forEach((p) => onRegenerate(slot, p, adjust))}>
          <Icon name="refresh" size={13} />
          Regenerate {shown.length > 1 ? "both" : ""}
        </Button>
        {untried.map((p) => (
          <Button key={p} variant="ghost" onClick={() => onRegenerate(slot, p, adjust)}>
            Try with {PROVIDER_LABEL[p]}
          </Button>
        ))}
      </div>
    </section>
  );
}

function Candidate(props: {
  listingId: string;
  provider: ProviderName;
  image?: ImageDTO;
  busy: boolean;
  requestError?: string;
  isPicked: boolean;
  showPick: boolean;
  onSelect: (img: ImageDTO) => void;
  onRegenerate: () => void;
}) {
  const { image, busy, provider } = props;
  const pending = busy || image?.status === "pending";
  const failedMessage = !pending ? props.requestError ?? (image?.status === "failed" ? image.error : null) : null;
  const ready = !pending && image?.status === "done" && image.url;

  return (
    <div className={`flex min-w-0 flex-col bg-paper ${props.isPicked && props.showPick ? "outline-2 -outline-offset-2 outline-accent" : ""}`}>
      <div className="relative aspect-square bg-white">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url!} alt={`${provider} result`} className="absolute inset-0 size-full object-contain" />
        ) : pending ? (
          <div className="busy absolute inset-0 flex items-end p-3">
            <span className="bg-paper/90 px-2 py-1 text-xs font-semibold text-accent-strong">Generating with {PROVIDER_LABEL[provider]}…</span>
          </div>
        ) : failedMessage ? (
          <div className="absolute inset-0 flex flex-col items-start justify-end gap-1 bg-accent-soft p-4">
            <span className="text-sm font-extrabold text-accent-ink">Couldn&apos;t generate</span>
            <span className="text-[13px] text-accent-ink">{failedMessage}</span>
          </div>
        ) : (
          <div className="striped absolute inset-0" />
        )}
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-extrabold">{PROVIDER_LABEL[provider]}</span>
          <span className="truncate font-mono text-[11px] text-muted">{image?.model ?? ""}</span>
        </div>
        <div className="flex gap-2">
          {props.showPick && (
            <Button
              variant={props.isPicked ? "primary" : "outline"}
              disabled={!ready}
              aria-pressed={props.isPicked}
              onClick={() => image && props.onSelect(image)}
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
          <Button onClick={props.onRegenerate} disabled={pending} className="flex-1 justify-center px-2.5 py-[7px] text-xs">
            <Icon name="refresh" size={13} /> Regenerate
          </Button>
          {ready && (
            <a
              href={`/api/listings/${props.listingId}/images/${image.id}`}
              aria-label="Download image"
              className="inline-flex h-8 w-[34px] items-center justify-center border border-line text-ink hover:bg-ink/[0.07] hover:text-ink"
            >
              <Icon name="download" size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
