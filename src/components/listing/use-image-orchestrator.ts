"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchListing, generateImage } from "@/lib/client/api";
import { slotsFor, type ProviderName, type Slot } from "@/lib/listing/schema";
import type { ImageDTO, ListingDTO } from "@/lib/listing/types";

export const keyOf = (slot: Slot, provider: ProviderName) => `${slot}:${provider}`;

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
 * keeps track of what is in flight, and polls if the server has pending images
 * this tab didn't start (e.g. after a page refresh).
 */
export function useImageOrchestrator(initial: ListingDTO) {
  const [listing, setListing] = useState(initial);
  const [inflight, setInflight] = useState<Set<string>>(() => new Set());
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
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
    (slot: Slot, provider: ProviderName, adjust?: string) => {
      const key = keyOf(slot, provider);
      kicked.current.add(key);
      setInflight((s) => new Set(s).add(key));
      setRequestErrors(({ [key]: _cleared, ...rest }) => rest);
      generateImage(listing.id, slot, provider, adjust)
        .then(mergeImage)
        .catch((err: Error) => setRequestErrors((e) => ({ ...e, [key]: err.message })))
        .finally(() =>
          setInflight((s) => {
            const next = new Set(s);
            next.delete(key);
            return next;
          }),
        );
    },
    [listing.id, mergeImage],
  );

  // Auto-start generation with the model the seller chose — once per slot.
  useEffect(() => {
    if (listing.status !== "ready") return;
    for (const slot of slotsFor(listing.imageCount)) {
      const key = keyOf(slot, listing.provider);
      if (!kicked.current.has(key) && !latestImage(listing.images, slot, listing.provider)) run(slot, listing.provider);
    }
  }, [listing, run]);

  // Poll for server-side pending images this tab isn't waiting on.
  const orphanPending = listing.images.some((i) => i.status === "pending" && !inflight.has(keyOf(i.slot, i.provider)));
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

  return { listing, setListing, inflight, requestErrors, run };
}
