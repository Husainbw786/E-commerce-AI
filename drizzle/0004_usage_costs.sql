ALTER TABLE "usage_event" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "cost_usd" double precision;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_image_id_listing_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."listing_image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_event_listing_idx" ON "usage_event" USING btree ("listing_id");--> statement-breakpoint
-- Backfill: label old rows. Before this migration the questions call was logged with model "questions" (it ran on gpt-6-astra).
UPDATE "usage_event" SET "purpose" = 'questions', "model" = 'gpt-6-astra' WHERE "model" = 'questions';--> statement-breakpoint
UPDATE "usage_event" SET "purpose" = 'listing' WHERE "purpose" IS NULL AND "kind" = 'text';--> statement-breakpoint
UPDATE "usage_event" SET "purpose" = 'image' WHERE "purpose" IS NULL AND "kind" = 'image';--> statement-breakpoint
-- Link old image calls to the image row they produced: same listing + model, newest image created before the call finished.
UPDATE "usage_event" ue SET "image_id" = (
  SELECT li."id" FROM "listing_image" li
  WHERE li."listing_id" = ue."listing_id" AND li."model" = ue."model" AND li."created_at" <= ue."created_at"
  ORDER BY li."created_at" DESC LIMIT 1
) WHERE ue."kind" = 'image' AND ue."image_id" IS NULL AND ue."listing_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "usage_event" ue SET "purpose" = 'edit' FROM "listing_image" li WHERE ue."image_id" = li."id" AND li."base_image_id" IS NOT NULL;
