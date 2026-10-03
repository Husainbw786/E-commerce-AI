ALTER TABLE "listing" ADD COLUMN "source_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "listing" SET "source_urls" = jsonb_build_array("source_url") WHERE "source_urls" = '[]'::jsonb;
