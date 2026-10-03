CREATE TYPE "public"."image_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('analysing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."image_provider" AS ENUM('openai', 'gemini');--> statement-breakpoint
CREATE TYPE "public"."image_slot" AS ENUM('primary', 'detail', 'size');--> statement-breakpoint
CREATE TYPE "public"."usage_kind" AS ENUM('text', 'image');--> statement-breakpoint
CREATE TABLE "listing_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"slot" "image_slot" NOT NULL,
	"provider" "image_provider" NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"adjust" text,
	"url" text,
	"status" "image_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_url" text NOT NULL,
	"image_count" integer NOT NULL,
	"status" "listing_status" DEFAULT 'analysing' NOT NULL,
	"details" jsonb,
	"error" text,
	"sku" text,
	"text_model" text,
	"client_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"kind" "usage_kind" NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"usage" jsonb,
	"ms" integer,
	"ok" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_image" ADD CONSTRAINT "listing_image_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_image_listing_idx" ON "listing_image" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_created_idx" ON "listing" USING btree ("created_at");