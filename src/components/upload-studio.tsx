"use client";

import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createListing, uploadPhoto } from "@/lib/client/api";
import { SLOT_INFO, slotsFor } from "@/lib/listing/schema";
import { Button, Icon, SectionHeading, Segmented, StepsBar } from "./ui";

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

function formatBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

type Stage = "idle" | "compressing" | "uploading" | "analysing";
const STAGE_TEXT: Record<Stage, string> = {
  idle: "",
  compressing: "Preparing photo…",
  uploading: "Uploading photo…",
  analysing: "Reading your product and writing the listing… (about 10–30 s)",
};

export function UploadStudio({ mode }: { mode: "dual" | "fallback" }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [count, setCount] = useState<1 | 2 | 3>(3);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(f: File | undefined | null) {
    setError("");
    if (!f) return;
    if (!f.type.startsWith("image/") && !/\.(heic|heif)$/i.test(f.name)) return setError("Please choose a photo (JPG, PNG or WEBP).");
    if (f.size > MAX_INPUT_BYTES) return setError("That photo is over 20 MB. Please pick a smaller one.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clear() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function generate() {
    if (!file) return;
    setError("");
    try {
      setStage("compressing");
      const small = await imageCompression(file, {
        maxWidthOrHeight: 2048,
        maxSizeMB: 3,
        fileType: "image/jpeg",
        initialQuality: 0.88,
        useWebWorker: true,
      });
      setStage("uploading");
      const url = await uploadPhoto(small, file.name.replace(/\.[^.]+$/, "") + ".jpg");
      setStage("analysing");
      const listing = await createListing(url, count);
      router.push(`/listing/${listing.id}`);
    } catch (err) {
      setStage("idle");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const busy = stage !== "idle";

  return (
    <>
      <StepsBar active={0} />
      <main className="mx-auto max-w-[1120px] px-6 pb-14 pt-8">
        <div className="mb-8 max-w-[680px]">
          <h1 className="m-0 mb-2.5 text-[clamp(30px,5vw,44px)] font-extrabold leading-[1.06] tracking-[-0.02em] [text-wrap:pretty]">
            Upload one photo. Get a full Meesho listing.
          </h1>
          <p className="m-0 max-w-[54ch] text-base text-muted [text-wrap:pretty]">
            Drop a plain product photo. You get 1 to 3 ready-to-upload images and every listing field, written for Meesho and ready to copy.
          </p>
        </div>

        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <SectionHeading num="01" title="Product photo" />
            {!preview ? (
              <>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    pick(e.dataTransfer.files?.[0]);
                  }}
                  className={`relative flex aspect-[4/3] cursor-pointer flex-col items-start justify-end gap-2.5 border-2 border-dashed p-6 hover:border-accent ${
                    drag ? "border-accent bg-accent-soft" : "border-line bg-paper"
                  }`}
                >
                  <input ref={inputRef} type="file" accept={ACCEPT} className="absolute size-0 opacity-0" onChange={(e) => pick(e.target.files?.[0])} />
                  <span className="text-accent">
                    <Icon name="upload" size={36} />
                  </span>
                  <span className="text-[22px] font-extrabold leading-tight">Drop a product photo here</span>
                  <span className="text-sm text-muted">or click to browse · JPG, PNG or WEBP up to 20 MB</span>
                </label>
                <p className="mt-4 max-w-[48ch] text-[13px] text-muted">
                  Works best with one product in frame, even light and the whole item visible. Background can be anything. If you sell a pack (e.g. 2 pieces), put all pieces in the photo.
                </p>
              </>
            ) : (
              <>
                <div className="relative aspect-[4/3] border border-line bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Uploaded product" className="absolute inset-0 size-full object-contain p-6" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="mr-auto min-w-0">
                    <div className="max-w-[280px] truncate text-sm font-semibold">{file?.name}</div>
                    <div className="text-xs text-muted">{file && formatBytes(file.size)}</div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center gap-1.5 border border-line px-3 py-[7px] text-[13px] font-extrabold hover:bg-ink/[0.07]">
                    <input type="file" accept={ACCEPT} className="absolute size-0 opacity-0" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
                    Replace
                  </label>
                  <Button variant="ghost" onClick={clear} disabled={busy}>
                    Remove
                  </Button>
                </div>
              </>
            )}
          </section>

          <section className="flex min-w-0 flex-col gap-8">
            <div>
              <SectionHeading num="02" title="Number of images" className="mb-4" />
              <Segmented
                label="Number of images"
                value={count}
                onChange={setCount}
                options={[1, 2, 3].map((n) => ({ value: n as 1 | 2 | 3, label: `${n} image${n > 1 ? "s" : ""}` }))}
              />
              <ol className="m-0 mt-2 list-none p-0">
                {slotsFor(3).map((slot, i) => {
                  const on = i < count;
                  return (
                    <li key={slot} className={`grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-b border-line py-3.5 ${on ? "" : "opacity-40"}`}>
                      <span className="mt-[3px] text-[11px] font-semibold tracking-[0.1em] text-muted">0{i + 1}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[15px] font-extrabold">{SLOT_INFO[slot].name}</span>
                        <span className="text-[13px] text-muted">{SLOT_INFO[slot].desc}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-[13px] text-muted">
                {mode === "dual" ? "Each image is made by both OpenAI and Gemini — you pick the better one." : "If one image model fails, the other takes over automatically."} Title, description and all Meesho fields are always included.
              </p>
            </div>

            <div>
              <Button
                variant="primary"
                onClick={generate}
                disabled={!file || busy}
                className="w-full justify-between px-[18px] py-4 text-base"
              >
                <span>{!file ? "Add a photo to generate" : busy ? STAGE_TEXT[stage] : `Generate ${count} image${count > 1 ? "s" : ""} + listing`}</span>
                <Icon name="arrow" size={20} />
              </Button>
              {error ? (
                <p role="alert" className="mt-2 text-[13px] font-semibold text-accent-strong">
                  {error}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted">Listing details in ~20 s · images follow in about a minute</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
