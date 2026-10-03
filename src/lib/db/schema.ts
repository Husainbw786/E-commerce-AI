import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ListingDetails } from "@/lib/listing/schema";

export const listingStatus = pgEnum("listing_status", ["analysing", "ready", "failed"]);
export const slotEnum = pgEnum("image_slot", ["primary", "detail", "size"]);
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
    url: text("url"),
    status: imageStatus("status").notNull().default("pending"),
    error: text("error"),
    selected: boolean("selected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listing_image_listing_idx").on(t.listingId)],
);

export const usageEvents = pgTable("usage_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  kind: usageKind("kind").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  usage: jsonb("usage"),
  ms: integer("ms"),
  ok: boolean("ok").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Listing = typeof listings.$inferSelect;
export type ListingImage = typeof listingImages.$inferSelect;
