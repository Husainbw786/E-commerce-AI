import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { analyseProduct, askQuestions } from "@/lib/ai/openai-text";
import { buildEditPrompt, buildImagePrompt, zoomScaleFor } from "@/lib/ai/prompts";
import { availableProviders, defaultProvider, getImageProvider } from "@/lib/ai/providers";
import { db, schema } from "@/lib/db";
import type { Listing, ListingImage } from "@/lib/db/schema";
import { HttpError, errorMessage } from "@/lib/http";
import { normalizeListingImage, toAnalysisJpeg, zoomImage } from "@/lib/image/normalize";
import { deleteFiles, readStoredFile, saveFile } from "@/lib/storage";
import { postprocess } from "./postprocess";
import { slotsFor, type ListingPatch, type ProviderName, type SellerAnswer, type SellerQuestions, type Slot } from "./schema";
import type { ImageDTO, ListingDTO, ListingSummaryDTO } from "./types";

const { listings, listingImages, usageEvents } = schema;
const STALE_PENDING_MS = 5 * 60_000;

function toImageDTO(img: ListingImage): ImageDTO {
  const stale = img.status === "pending" && Date.now() - img.createdAt.getTime() > STALE_PENDING_MS;
  return {
    id: img.id,
    slot: img.slot,
    provider: img.provider,
    model: img.model,
    url: img.url,
    status: stale ? "failed" : img.status,
    error: stale ? "Timed out. Try regenerating." : img.error,
    selected: img.selected,
    adjust: img.adjust,
    baseImageId: img.baseImageId,
    createdAt: img.createdAt.toISOString(),
  };
}

/** Rows created before multi-photo support only have sourceUrl. */
function sourcesOf(listing: Listing): string[] {
  return listing.sourceUrls?.length ? listing.sourceUrls : [listing.sourceUrl];
}

function listingSlots(listing: Listing): Slot[] {
  return slotsFor(listing.imageCount, listing.lifestyle);
}

async function readSources(listing: Listing): Promise<Buffer[]> {
  return Promise.all(sourcesOf(listing).map(readStoredFile));
}

function toDTO(listing: Listing, images: ListingImage[]): ListingDTO {
  return {
    id: listing.id,
    sourceUrl: listing.sourceUrl,
    sourceUrls: sourcesOf(listing),
    imageCount: listing.imageCount,
    slots: listingSlots(listing),
    lifestyle: listing.lifestyle,
    lifestyleScene: listing.lifestyleScene,
    sellerNotes: listing.sellerNotes,
    sellerAnswers: listing.sellerAnswers ?? [],
    status: listing.status,
    details: listing.details ?? null,
    error: listing.error,
    sku: listing.sku,
    createdAt: listing.createdAt.toISOString(),
    images: images.map(toImageDTO),
    provider: listing.imageProvider ?? defaultProvider(),
    availableProviders: availableProviders(),
  };
}

async function recordUsage(e: typeof usageEvents.$inferInsert) {
  try {
    await (await db()).insert(usageEvents).values(e);
  } catch (err) {
    console.error("[usage] failed to record", err);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findListing(id: string): Promise<Listing> {
  if (!UUID.test(id)) throw new HttpError(404, "Listing not found");
  const [row] = await (await db()).select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!row) throw new HttpError(404, "Listing not found");
  return row;
}

export async function getListing(id: string): Promise<ListingDTO> {
  const listing = await findListing(id);
  const images = await (await db())
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(listingImages.createdAt);
  return toDTO(listing, images);
}

export async function listListings(limit = 100): Promise<ListingSummaryDTO[]> {
  const d = await db();
  const rows = await d.select().from(listings).orderBy(desc(listings.createdAt)).limit(limit);
  if (!rows.length) return [];
  const imgs = await d
    .select()
    .from(listingImages)
    .where(and(inArray(listingImages.listingId, rows.map((r) => r.id)), eq(listingImages.status, "done")));
  return rows.map((r) => {
    const mine = imgs.filter((i) => i.listingId === r.id && i.slot === "primary");
    const cover = mine.find((i) => i.selected) ?? mine[0];
    return {
      id: r.id,
      title: r.details?.title ?? (r.status === "failed" ? "Failed listing" : "Analysing…"),
      sourceUrl: r.sourceUrl,
      imageCount: r.imageCount,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      coverUrl: cover?.url ?? null,
    };
  });
}

async function readUploads(urls: string[]): Promise<Buffer[]> {
  return Promise.all(urls.map(readStoredFile)).catch(() => {
    throw new HttpError(400, "Uploaded photo not found. Please upload again.");
  });
}

/** Optional step 0: let the AI look at the photos and ask the seller a few questions. */
export async function questionsFor(input: { sourceUrls: string[]; notes?: string }): Promise<SellerQuestions> {
  const photos = await readUploads(Array.from(new Set(input.sourceUrls)));
  const started = Date.now();
  try {
    const { questions, usage } = await askQuestions(await Promise.all(photos.map(toAnalysisJpeg)), input.notes);
    await recordUsage({ kind: "text", provider: "openai", model: "questions", usage, ms: Date.now() - started, ok: true });
    return questions;
  } catch (err) {
    console.error("[questions]", err);
    await recordUsage({ kind: "text", provider: "openai", model: "questions", usage: { error: errorMessage(err) }, ms: Date.now() - started, ok: false });
    throw new HttpError(502, "Couldn't prepare questions. You can skip them and generate directly.");
  }
}

/** Step 1: store the listing and run the text analysis. */
export async function createListing(input: {
  sourceUrls: string[];
  imageCount: number;
  provider: ProviderName;
  clientIp: string;
  notes?: string;
  answers?: SellerAnswer[];
  lifestyle?: boolean;
  lifestyleScene?: string;
}): Promise<ListingDTO> {
  if (!availableProviders().includes(input.provider)) throw new HttpError(400, "That image model is not set up.");
  const d = await db();
  const sourceUrls = Array.from(new Set(input.sourceUrls));
  const photos = await readUploads(sourceUrls);
  const answers = (input.answers ?? []).filter((a) => a.answer.trim());
  const ctx = { notes: input.notes?.trim() || null, answers, lifestyleScene: input.lifestyle ? input.lifestyleScene?.trim() || null : null };

  const [row] = await d
    .insert(listings)
    .values({
      sourceUrl: sourceUrls[0],
      sourceUrls,
      imageCount: input.imageCount,
      imageProvider: input.provider,
      lifestyle: !!input.lifestyle,
      lifestyleScene: ctx.lifestyleScene,
      sellerNotes: ctx.notes,
      sellerAnswers: answers,
      clientIp: input.clientIp,
    })
    .returning();

  const started = Date.now();
  try {
    const result = await analyseProduct(await Promise.all(photos.map(toAnalysisJpeg)), input.imageCount, ctx);
    const details = postprocess(result.details);
    await d
      .update(listings)
      .set({ status: "ready", details, textModel: result.model, updatedAt: new Date() })
      .where(eq(listings.id, row.id));
    await recordUsage({ listingId: row.id, kind: "text", provider: "openai", model: result.model, usage: result.usage, ms: Date.now() - started, ok: true });
  } catch (err) {
    console.error("[analyse]", err);
    await d
      .update(listings)
      .set({ status: "failed", error: "Could not read this photo. Try a clearer photo with one product in frame.", updatedAt: new Date() })
      .where(eq(listings.id, row.id));
    await recordUsage({ listingId: row.id, kind: "text", provider: "openai", model: "unknown", usage: { error: errorMessage(err) }, ms: Date.now() - started, ok: false });
  }
  return getListing(row.id);
}

export async function patchListing(id: string, patch: ListingPatch): Promise<ListingDTO> {
  const listing = await findListing(id);
  const details = listing.details;
  const update: Partial<typeof listings.$inferInsert> = { updatedAt: new Date() };
  if (patch.sku !== undefined) update.sku = patch.sku;
  if (patch.lifestyle !== undefined) update.lifestyle = patch.lifestyle;
  if (patch.lifestyleScene !== undefined) update.lifestyleScene = patch.lifestyleScene.trim() || null;
  if (details) {
    const next = { ...details };
    if (patch.title !== undefined) next.title = patch.title;
    if (patch.description !== undefined) next.description = patch.description;
    if (patch.keywords !== undefined) next.keywords = patch.keywords;
    if (patch.fields) {
      const values = new Map(patch.fields.map((f) => [f.key, f.value]));
      next.fields = details.fields.map((f) => (values.has(f.key) ? { ...f, value: values.get(f.key)! } : f));
    }
    update.details = next;
  }
  await (await db()).update(listings).set(update).where(eq(listings.id, id));
  return getListing(id);
}

export async function deleteListing(id: string): Promise<void> {
  const listing = await findListing(id);
  const d = await db();
  const images = await d.select().from(listingImages).where(eq(listingImages.listingId, id));
  await d.delete(listings).where(eq(listings.id, id));
  await deleteFiles([...sourcesOf(listing), ...images.map((i) => i.url).filter((u): u is string => !!u)]).catch((err) =>
    console.error("[delete] blob cleanup failed", err),
  );
}

function isTransient(err: unknown) {
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") return status >= 500 || status === 429;
  return /timeout|ETIMEDOUT|ECONNRESET|fetch failed|503|UNAVAILABLE/i.test(errorMessage(err));
}

function friendlyImageError(err: unknown): string {
  const msg = errorMessage(err);
  if (/safety|policy|blocked|PROHIBITED|moderation/i.test(msg)) return "The image model refused this request. Try an adjustment or the other model.";
  if (/rate|429|quota/i.test(msg)) return "The image model is busy or out of quota. Try again in a minute.";
  return "Image generation failed. Try regenerating.";
}

/**
 * Step 2: generate ONE image for one slot with one provider.
 * With baseImageId it edits that image (seller's adjustment) instead of starting over.
 * Every result is kept as a new version; the seller deletes the ones they don't want.
 */
export async function generateImage(input: {
  listingId: string;
  slot: Slot;
  provider: ProviderName;
  adjust?: string;
  baseImageId?: string;
}): Promise<ImageDTO> {
  const listing = await findListing(input.listingId);
  if (listing.status !== "ready" || !listing.details) throw new HttpError(409, "Listing details are not ready yet");
  if (!listingSlots(listing).includes(input.slot)) throw new HttpError(400, "This listing does not include that image");
  if (!availableProviders().includes(input.provider)) throw new HttpError(400, "That image model is not set up.");

  const d = await db();
  let base: ListingImage | undefined;
  if (input.baseImageId) {
    [base] = await d
      .select()
      .from(listingImages)
      .where(and(eq(listingImages.id, input.baseImageId), eq(listingImages.listingId, listing.id)))
      .limit(1);
    if (!base?.url || base.status !== "done" || base.slot !== input.slot) throw new HttpError(404, "Image to edit not found");
    if (!input.adjust?.trim()) throw new HttpError(400, "Describe the change you want");
  }

  // Zoom-only edits are exact and free: done in code, no AI call.
  const zoom = base ? zoomScaleFor(input.adjust!) : null;
  if (base?.url && zoom) {
    const jpeg = await zoomImage(await readStoredFile(base.url), zoom);
    const url = await saveFile(`listings/${listing.id}`, "jpg", jpeg, "image/jpeg");
    const [row] = await d
      .insert(listingImages)
      .values({
        listingId: listing.id,
        slot: input.slot,
        provider: base.provider,
        model: zoom < 1 ? "zoom out (exact)" : "zoom in (exact)",
        prompt: `zoom ${zoom}`,
        adjust: input.adjust!.trim(),
        baseImageId: base.id,
        url,
        status: "done",
      })
      .returning();
    return toImageDTO(row);
  }

  const provider = getImageProvider(input.provider);
  const prompt = base
    ? buildEditPrompt(input.slot, input.adjust!)
    : buildImagePrompt(listing.details, input.slot, input.adjust, listing.lifestyleScene);
  const [row] = await d
    .insert(listingImages)
    .values({
      listingId: listing.id,
      slot: input.slot,
      provider: provider.name,
      model: provider.model,
      prompt,
      adjust: input.adjust?.trim() || null,
      baseImageId: base?.id ?? null,
    })
    .returning();

  const started = Date.now();
  try {
    const sources = await readSources(listing);
    // When editing, the image being edited goes FIRST; the real photos follow for product accuracy.
    const referenceImages = base?.url ? [await readStoredFile(base.url), ...sources] : sources;
    let result;
    try {
      result = await provider.generate({ referenceImages, prompt });
    } catch (err) {
      if (!isTransient(err)) throw err;
      result = await provider.generate({ referenceImages, prompt });
    }
    const jpeg = await normalizeListingImage(result.image);
    const url = await saveFile(`listings/${listing.id}`, "jpg", jpeg, "image/jpeg");

    // The first finished image in a slot becomes the pick. Later versions don't steal it —
    // all versions stay visible and the seller chooses.
    const picked = await d
      .select({ id: listingImages.id })
      .from(listingImages)
      .where(and(eq(listingImages.listingId, listing.id), eq(listingImages.slot, input.slot), eq(listingImages.selected, true)));
    const [updated] = await d
      .update(listingImages)
      .set({ status: "done", url, selected: picked.length === 0 })
      .where(eq(listingImages.id, row.id))
      .returning();
    await recordUsage({ listingId: listing.id, kind: "image", provider: provider.name, model: provider.model, usage: result.usage, ms: Date.now() - started, ok: true });
    return toImageDTO(updated);
  } catch (err) {
    console.error(`[image:${provider.name}]`, err);
    const [failed] = await d
      .update(listingImages)
      .set({ status: "failed", error: friendlyImageError(err) })
      .where(eq(listingImages.id, row.id))
      .returning();
    await recordUsage({ listingId: listing.id, kind: "image", provider: provider.name, model: provider.model, usage: { error: errorMessage(err) }, ms: Date.now() - started, ok: false });
    return toImageDTO(failed);
  }
}

export async function selectImage(listingId: string, imageId: string): Promise<ListingDTO> {
  if (!UUID.test(listingId) || !UUID.test(imageId)) throw new HttpError(404, "Image not found");
  const d = await db();
  const [img] = await d
    .select()
    .from(listingImages)
    .where(and(eq(listingImages.id, imageId), eq(listingImages.listingId, listingId)))
    .limit(1);
  if (!img || img.status !== "done") throw new HttpError(404, "Image not found");
  await d
    .update(listingImages)
    .set({ selected: false })
    .where(and(eq(listingImages.listingId, listingId), eq(listingImages.slot, img.slot)));
  await d.update(listingImages).set({ selected: true }).where(eq(listingImages.id, imageId));
  return getListing(listingId);
}

/** Remove one version. If it was the pick, the newest remaining finished version becomes the pick. */
export async function deleteImage(listingId: string, imageId: string): Promise<ListingDTO> {
  if (!UUID.test(listingId) || !UUID.test(imageId)) throw new HttpError(404, "Image not found");
  const d = await db();
  const [img] = await d
    .select()
    .from(listingImages)
    .where(and(eq(listingImages.id, imageId), eq(listingImages.listingId, listingId)))
    .limit(1);
  if (!img) throw new HttpError(404, "Image not found");
  await d.delete(listingImages).where(eq(listingImages.id, imageId));
  if (img.selected) {
    const [next] = await d
      .select({ id: listingImages.id })
      .from(listingImages)
      .where(and(eq(listingImages.listingId, listingId), eq(listingImages.slot, img.slot), eq(listingImages.status, "done")))
      .orderBy(desc(listingImages.createdAt))
      .limit(1);
    if (next) await d.update(listingImages).set({ selected: true }).where(eq(listingImages.id, next.id));
  }
  if (img.url) await deleteFiles([img.url]).catch((err) => console.error("[delete image] file cleanup failed", err));
  return getListing(listingId);
}
