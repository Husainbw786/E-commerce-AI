"use client";

import { useEffect, useRef, useState } from "react";
import { imageFileName, safeSku } from "@/lib/listing/export";
import { SLOT_INFO, slotsFor } from "@/lib/listing/schema";
import type { ListingDTO } from "@/lib/listing/types";
import { Button, Icon, inputClass } from "../ui";
import { pickedImage } from "./use-image-orchestrator";

export function ExportDialog({ listing, onClose }: { listing: ListingDTO; onClose: () => void }) {
  const [sku, setSku] = useState(listing.sku ?? "");
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const files = slotsFor(listing.imageCount).map((slot, i) => ({
    slot,
    file: imageFileName(sku, i, slot),
    ready: !!pickedImage(listing.images, slot),
  }));
  const readyCount = files.filter((f) => f.ready).length;
  const zipName = `${safeSku(sku)}_meesho.zip`;

  return (
    <div onClick={onClose} className="fixed inset-0 z-10 grid place-items-center bg-[rgba(45,43,43,0.5)] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-[min(480px,100%)] flex-col gap-4 border-t-4 border-accent bg-paper p-6 shadow-[0_12px_32px_rgba(45,43,43,0.22)]"
      >
        <div className="flex items-start gap-3">
          <div id="export-title" className="mr-auto text-[22px] font-extrabold leading-tight">
            Export listing
          </div>
          <button onClick={onClose} aria-label="Close" className="flex size-8 cursor-pointer items-center justify-center border-0 bg-transparent text-ink hover:bg-ink/[0.07]">
            <Icon name="close" size={16} />
          </button>
        </div>

        {!done ? (
          <>
            <div>
              <label htmlFor="sku" className="mb-1 block text-xs text-ink-2">
                SKU / file prefix
              </label>
              <input id="sku" value={sku} maxLength={60} onChange={(e) => setSku(e.target.value)} placeholder="e.g. KNIFE-BLUE-2PK" className={`${inputClass} font-mono`} />
            </div>
            <div className="border-t-2 border-line">
              {files.map((f) => (
                <div key={f.slot} className="flex justify-between gap-3 border-b border-line py-2 text-[13px]">
                  <span className={`truncate font-mono ${f.ready ? "" : "text-faint line-through"}`}>{f.file}</span>
                  <span className="flex-none text-muted">{SLOT_INFO[f.slot].name}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-b border-line py-2 text-[13px]">
                <span className="truncate font-mono">{safeSku(sku)}_listing.txt</span>
                <span className="flex-none text-muted">All listing fields</span>
              </div>
            </div>
            <p className="m-0 text-xs text-muted">JPG · sRGB · 1500 × 1500 px, white background. Uses the image you selected in each slot.</p>
            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <a
                href={`/api/listings/${listing.id}/export?sku=${encodeURIComponent(sku)}`}
                onClick={(e) => {
                  if (!readyCount) return e.preventDefault();
                  setTimeout(() => setDone(true), 400);
                }}
                aria-disabled={!readyCount}
                className={`inline-flex items-center gap-2.5 bg-accent px-3.5 py-2.5 text-[13px] font-extrabold text-paper no-underline hover:bg-accent-hover hover:text-paper ${
                  readyCount ? "" : "pointer-events-none opacity-45"
                }`}
              >
                Download ZIP <Icon name="download" />
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="flex size-9 flex-none items-center justify-center bg-accent text-white">
                <Icon name="check" size={18} />
              </div>
              <div>
                <div className="text-base font-extrabold">{zipName} is downloading</div>
                <div className="text-sm text-muted">
                  {readyCount} image{readyCount === 1 ? "" : "s"} + listing.txt. Upload the images in the Meesho catalog step, then paste the fields.
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
