ALTER TABLE "listing" ADD COLUMN "image_model" text;--> statement-breakpoint
UPDATE "listing" SET "image_model" = CASE WHEN "image_provider" = 'openai' THEN 'gpt-image-2.5-flare' ELSE 'gemini-3.1-flash-image' END WHERE "image_model" IS NULL;
