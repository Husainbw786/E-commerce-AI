import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ListingDetails, SellerAnswer } from "@/lib/listing/schema";

export const listingStatus = pgEnum("listing_status", ["analysing", "ready", "failed"]);
export const slotEnum = pgEnum("image_slot", ["primary", "detail", "size", "lifestyle"]);
export const providerEnum = pgEnum("image_provider", ["openai", "gemini"]);
export const imageStatus = pgEnum("image_status", ["pending", "done", "failed"]);
export const usageKind = pgEnum("usage_kind", ["text", "image"]);

export const listings = pgTable(
  "listing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceUrl: text("source_url").notNull(),
    /** All reference photos, first = main. sourceUrl is kept equal to sourceUrls[0]. */
    sourceUrls: jsonb("source_urls").$type<string[]>().notNull().default([]),
    imageCount: integer("image_count").notNull(),
    /** Image model the seller chose. Null on rows created before the picker existed. */
    imageProvider: providerEnum("image_provider"),
    /** Extra in-use image requested. */
    lifestyle: boolean("lifestyle").notNull().default(false),
    lifestyleScene: text("lifestyle_scene"),
    /** What the seller told us: free notes + answers to the AI's questions. */
    sellerNotes: text("seller_notes"),
    sellerAnswers: jsonb("seller_answers").$type<SellerAnswer[]>().notNull().default([]),
    status: listingStatus("status").notNull().default("analysing"),
    details: jsonb("details").$type<ListingDetails>(),
    error: text("error"),
    sku: text("sku"),
    textModel: text("text_model"),
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listing_created_idx").on(t.createdAt)],
);

export const listingImages = pgTable(
  "listing_image",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    slot: slotEnum("slot").notNull(),
    provider: providerEnum("provider").notNull(),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    adjust: text("adjust"),
    /** Set when this image is an edit of another image. */
    baseImageId: uuid("base_image_id"),
    url: text("url"),
    status: imageStatus("status").notNull().default("pending"),
    error: text("error"),
    selected: boolean("selected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listing_image_listing_idx").on(t.listingId)],
);

/** One row per AI call (including failed ones). Cost is stored at call time. */
export const usageEvents = pgTable(
  "usage_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
    /** Image this call produced. Kept (set null) if the image version is deleted, so spend stays accurate. */
    imageId: uuid("image_id").references(() => listingImages.id, { onDelete: "set null" }),
    kind: usageKind("kind").notNull(),
    /** questions | listing | image | edit */
    purpose: text("purpose"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    usage: jsonb("usage"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: doublePrecision("cost_usd"),
    ms: integer("ms"),
    ok: boolean("ok").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_event_listing_idx").on(t.listingId)],
);

export type UsageEvent = typeof usageEvents.$inferSelect;

export type Listing = typeof listings.$inferSelect;
export type ListingImage = typeof listingImages.$inferSelect;
