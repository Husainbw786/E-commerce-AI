"use client";

import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createListing, uploadPhoto } from "@/lib/client/api";
import { MAX_SOURCE_PHOTOS, SLOT_INFO, slotsFor, type ProviderName } from "@/lib/listing/schema";
import { Button, Icon, SectionHeading, Segmented, StepsBar } from "./ui";

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type Photo = { id: string; file: File; preview: string };

type Stage = "idle" | "compressing" | "uploading" | "analysing";
const STAGE_TEXT: Record<Stage, string> = {
  idle: "",
  compressing: "Preparing photos…",
  uploading: "Uploading photos…",
  analysing: "Reading your product and writing the listing… (about 20–40 s)",
};

const PROVIDER_INFO: Record<ProviderName, { label: string; model: string }> = {
  gemini: { label: "Gemini", model: "Nano Banana 2" },
  openai: { label: "OpenAI", model: "GPT Image 2.5" },
};
const PROVIDER_STORAGE_KEY = "listora:image-provider";

export function UploadStudio({ providers, defaultProvider }: { providers: ProviderName[]; defaultProvider: ProviderName }) {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderName>(defaultProvider);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [count, setCount] = useState<1 | 2 | 3>(3);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  // Remember the last model the seller picked (per browser).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROVIDER_STORAGE_KEY) as ProviderName | null;
      // Read after hydration on purpose: the server can't see localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && providers.includes(saved)) setProvider(saved);
    } catch {}
  }, [providers]);

  function chooseProvider(p: ProviderName) {
    setProvider(p);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, p);
    } catch {}
  }

  // Free preview URLs when leaving the page.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function add(list: FileList | File[] | null | undefined) {
    setError("");
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const room = MAX_SOURCE_PHOTOS - photos.length;
    const accepted: Photo[] = [];
    for (const f of files) {
      if (!f.type.startsWith("image/") && !/\.(heic|heif)$/i.test(f.name)) {
        setError("Please choose photos (JPG, PNG or WEBP).");
        continue;
      }
      if (f.size > MAX_INPUT_BYTES) {
        setError(`${f.name} is over 20 MB. Please pick a smaller one.`);
        continue;
      }
      if (accepted.length >= room) {
        setError(`Up to ${MAX_SOURCE_PHOTOS} photos per product.`);
        break;
      }
      accepted.push({ id: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f) });
    }
    if (accepted.length) setPhotos((p) => [...p, ...accepted]);
  }

  function remove(id: string) {
    setPhotos((list) => {
      const gone = list.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((p) => p.id !== id);
    });
  }

  function makeMain(id: string) {
    setPhotos((list) => [...list.filter((p) => p.id === id), ...list.filter((p) => p.id !== id)]);
  }

  async function generate() {
    if (!photos.length) return;
    setError("");
    try {
      setStage("compressing");
      const small = await Promise.all(
        photos.map((p) =>
          imageCompression(p.file, { maxWidthOrHeight: 2048, maxSizeMB: 3, fileType: "image/jpeg", initialQuality: 0.88, useWebWorker: true }),
        ),
      );
      setStage("uploading");
      const urls = await Promise.all(small.map((blob, i) => uploadPhoto(blob, photos[i].file.name.replace(/\.[^.]+$/, "") + ".jpg")));
      setStage("analysing");
      const listing = await createListing(urls, count, provider);
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
            Upload a photo. Get a full Meesho listing.
          </h1>
          <p className="m-0 max-w-[54ch] text-base text-muted [text-wrap:pretty]">
            Drop a plain product photo — or a few angles of it. You get 1 to 3 ready-to-upload images and every listing field, written for Meesho and ready to copy.
          </p>
        </div>

        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <SectionHeading
              num="01"
              title="Product photos"
              right={photos.length > 0 && <span className="text-[13px] text-muted">{photos.length} of {MAX_SOURCE_PHOTOS}</span>}
            />
            {photos.length === 0 ? (
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
                    add(e.dataTransfer.files);
                  }}
                  className={`relative flex aspect-[4/3] cursor-pointer flex-col items-start justify-end gap-2.5 border-2 border-dashed p-6 hover:border-accent ${
                    drag ? "border-accent bg-accent-soft" : "border-line bg-paper"
                  }`}
                >
                  <input type="file" multiple accept={ACCEPT} className="absolute size-0 opacity-0" onChange={(e) => {
                    add(e.target.files);
                    e.target.value = "";
                  }} />
                  <span className="text-accent">
                    <Icon name="upload" size={36} />
                  </span>
                  <span className="text-[22px] font-extrabold leading-tight">Drop product photos here</span>
                  <span className="text-sm text-muted">or click to browse · 1 to {MAX_SOURCE_PHOTOS} photos · JPG, PNG or WEBP up to 20 MB each</span>
                </label>
                <p className="mt-4 max-w-[52ch] text-[13px] text-muted">
                  One photo works. Extra photos from other angles (side, back, close-up) help the AI get details and size right. All photos must be of the same product. If you sell a pack, show all pieces together in the first photo.
                </p>
              </>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  add(e.dataTransfer.files);
                }}
              >
                <div className={`relative aspect-[4/3] border bg-white ${drag ? "border-accent" : "border-line"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos[0].preview} alt="Main product photo" className="absolute inset-0 size-full object-contain p-6" />
                  <span className="absolute left-3 top-3 bg-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-paper">Main photo</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {photos.map((p, i) => (
                    <div key={p.id} className={`relative aspect-square border-2 bg-white ${i === 0 ? "border-accent" : "border-line"}`}>
                      <button
                        type="button"
                        onClick={() => makeMain(p.id)}
                        disabled={busy || i === 0}
                        aria-label={i === 0 ? `${p.file.name} (main photo)` : `Make ${p.file.name} the main photo`}
                        title={i === 0 ? "Main photo" : "Make main photo"}
                        className="block size-full cursor-pointer border-0 bg-transparent p-1 disabled:cursor-default"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.preview} alt="" className="size-full object-contain" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        disabled={busy}
                        aria-label={`Remove ${p.file.name}`}
                        className="absolute right-0 top-0 flex size-6 cursor-pointer items-center justify-center border-0 bg-ink text-paper hover:bg-accent disabled:opacity-40"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_SOURCE_PHOTOS && (
                    <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-line text-center text-xs font-extrabold text-muted hover:border-accent hover:text-accent">
                      <input type="file" multiple accept={ACCEPT} disabled={busy} className="absolute size-0 opacity-0" onChange={(e) => {
                        add(e.target.files);
                        e.target.value = "";
                      }} />
                      <Icon name="plus" size={18} />
                      Add angle
                    </label>
                  )}
                </div>
                <p className="mt-3 text-[13px] text-muted">
                  {photos.length === 1
                    ? "Have more angles? Add side, back or close-up shots of the same product for better results."
                    : "Tap a photo to make it the main one. All photos are used as references for every image."}
                </p>
              </div>
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
              <p className="mt-3 text-[13px] text-muted">Title, description and all Meesho fields are always included.</p>
            </div>

            <div>
              <SectionHeading num="03" title="Image model" className="mb-4" />
              {providers.length === 0 ? (
                <p className="m-0 text-[13px] font-semibold text-accent-strong">No image model is set up. Add OPENAI_API_KEY or GEMINI_API_KEY.</p>
              ) : (
                <>
                  <Segmented
                    label="Image model"
                    value={provider}
                    onChange={chooseProvider}
                    options={providers.map((p) => ({
                      value: p,
                      label: (
                        <span className="flex flex-col">
                          <span>{PROVIDER_INFO[p].label}</span>
                          <span className="text-xs font-normal opacity-70">{PROVIDER_INFO[p].model}</span>
                        </span>
                      ),
                    }))}
                  />
                  <p className="mt-3 text-[13px] text-muted">
                    Only this model generates your images. Not happy with one? You can retry that image with the other model on the next screen.
                  </p>
                </>
              )}
            </div>

            <div>
              <Button
                variant="primary"
                onClick={generate}
                disabled={!photos.length || busy || providers.length === 0}
                className="w-full justify-between px-[18px] py-4 text-base"
              >
                <span>{!photos.length ? "Add a photo to generate" : busy ? STAGE_TEXT[stage] : `Generate ${count} image${count > 1 ? "s" : ""} + listing`}</span>
                <Icon name="arrow" size={20} />
              </Button>
              {error ? (
                <p role="alert" className="mt-2 text-[13px] font-semibold text-accent-strong">
                  {error}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted">Listing details in ~30 s · images follow in about 30 s</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
