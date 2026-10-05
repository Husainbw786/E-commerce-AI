-- Re-link pre-tracking image calls (cost_usd IS NULL) to the image they produced.
-- Each image row is created right before its AI call starts, so the matching image is the one
-- whose created_at is closest to (call finished - call duration). Parallel calls no longer collide.
UPDATE "usage_event" SET "image_id" = NULL WHERE "kind" = 'image' AND "cost_usd" IS NULL;--> statement-breakpoint
UPDATE "usage_event" ue SET "image_id" = m."image_id" FROM (
  SELECT DISTINCT ON (li."id") li."id" AS "image_id", ue2."id" AS "usage_id"
  FROM "usage_event" ue2
  JOIN "listing_image" li
    ON li."listing_id" = ue2."listing_id" AND li."model" = ue2."model"
   AND li."created_at" <= ue2."created_at"
   AND li."created_at" >= ue2."created_at" - make_interval(secs => COALESCE(ue2."ms", 0) / 1000.0 + 5)
  WHERE ue2."kind" = 'image' AND ue2."cost_usd" IS NULL
  ORDER BY li."id", abs(extract(epoch FROM (ue2."created_at" - make_interval(secs => COALESCE(ue2."ms", 0) / 1000.0) - li."created_at")))
) m
WHERE ue."id" = m."usage_id";--> statement-breakpoint
UPDATE "usage_event" ue SET "purpose" = CASE WHEN li."base_image_id" IS NULL THEN 'image' ELSE 'edit' END
FROM "listing_image" li WHERE ue."image_id" = li."id" AND ue."cost_usd" IS NULL;
