ALTER TYPE "public"."image_slot" ADD VALUE 'lifestyle';--> statement-breakpoint
ALTER TABLE "listing_image" ADD COLUMN "base_image_id" uuid;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "lifestyle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "lifestyle_scene" text;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "seller_notes" text;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "seller_answers" jsonb DEFAULT '[]'::jsonb NOT NULL;