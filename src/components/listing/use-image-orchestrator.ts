"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteImage as apiDeleteImage, fetchListing, generateImage } from "@/lib/client/api";
import type { ProviderName, Slot } from "@/lib/listing/schema";
import type { ImageDTO, ListingDTO } from "@/lib/listing/types";
import { useToast } from "../toast";

export const keyOf = (slot: Slot, provider: ProviderName) => `${slot}:${provider}`;

/** A request this tab is waiting on. Shown as a placeholder card until the image arrives. */
export type Inflight = { id: string; slot: Slot; provider: ProviderName; adjust?: string; edit: boolean };

export function latestImage(images: ImageDTO[], slot: Slot, provider: ProviderName): ImageDTO | undefined {
  let found: ImageDTO | undefined;
  for (const img of images) {
    if (img.slot === slot && img.provider === provider && (!found || img.createdAt >= found.createdAt)) found = img;
  }
  return found;
}

/** The image that will be exported for a slot: the selected one, else the newest finished one. */
export function pickedImage(images: ImageDTO[], slot: Slot): ImageDTO | undefined {
  const done = images.filter((i) => i.slot === slot && i.status === "done" && i.url);
  return done.find((i) => i.selected) ?? done[done.length - 1];
}

/**
 * Starts one request per slot (chosen model) as soon as the listing details are ready,
 * runs regenerations / edits on demand, and polls if the server has pending images
 * this tab didn't start (e.g. after a page refresh).
 */
export function useImageOrchestrator(initial: ListingDTO) {
  const toast = useToast();
  const [listing, setListing] = useState(initial);
  const [inflight, setInflight] = useState<Inflight[]>([]);
  const kicked = useRef(new Set<string>());

  const mergeImage = useCallback((img: ImageDTO) => {
    setListing((l) => {
      const exists = l.images.some((i) => i.id === img.id);
      let images = exists ? l.images.map((i) => (i.id === img.id ? img : i)) : [...l.images, img];
      if (img.selected) images = images.map((i) => (i.slot === img.slot && i.id !== img.id ? { ...i, selected: false } : i));
      return { ...l, images };
    });
  }, []);

  const run = useCallback(
    (slot: Slot, provider: ProviderName, opts: { adjust?: string; baseImageId?: string } = {}) => {
      kicked.current.add(keyOf(slot, provider));
      const req: Inflight = { id: crypto.randomUUID(), slot, provider, adjust: opts.adjust?.trim() || undefined, edit: !!opts.baseImageId };
      setInflight((list) => [...list, req]);
      generateImage(listing.id, slot, provider, opts)
        .then((img) => {
          mergeImage(img);
          // Pick up the new AI call in the cost totals.
          fetchListing(listing.id)
            .then((fresh) => setListing((l) => ({ ...l, usage: fresh.usage })))
            .catch(() => {});
        })
        .catch((err: Error) => toast(err.message))
        .finally(() => setInflight((list) => list.filter((r) => r.id !== req.id)));
    },
    [listing.id, mergeImage, toast],
  );

  const removeImage = useCallback(
    async (img: ImageDTO) => {
      setListing((l) => ({ ...l, images: l.images.filter((i) => i.id !== img.id) }));
      try {
        const fresh = await apiDeleteImage(listing.id, img.id);
        setListing((l) => ({ ...l, images: fresh.images }));
      } catch (err) {
        toast(err instanceof Error ? err.message : "Couldn't delete image");
      }
    },
    [listing.id, toast],
  );

  // Auto-start generation with the model the seller chose — once per slot.
  useEffect(() => {
    if (listing.status !== "ready") return;
    for (const slot of listing.slots) {
      const key = keyOf(slot, listing.provider);
      if (!kicked.current.has(key) && !latestImage(listing.images, slot, listing.provider)) run(slot, listing.provider);
    }
  }, [listing, run]);

  // Poll for server-side pending images this tab isn't waiting on.
  const orphanPending = inflight.length === 0 && listing.images.some((i) => i.status === "pending");
  const analysing = listing.status === "analysing";
  useEffect(() => {
    if (!orphanPending && !analysing) return;
    const t = setInterval(() => {
      fetchListing(listing.id)
        .then((fresh) => setListing((l) => ({ ...fresh, details: fresh.details ?? l.details })))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [orphanPending, analysing, listing.id]);

  return { listing, setListing, inflight, run, removeImage };
}
