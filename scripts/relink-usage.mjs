// One-off: link usage rows recorded before cost tracking (cost_usd IS NULL) to the image they produced.
// Greedy one-to-one match per (listing, model): image start ≈ call finish − call duration.
// Usage: node scripts/relink-usage.mjs   (reads DATABASE_URL from .env.local)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const events = await sql`select id, listing_id, model, ms, created_at from usage_event where kind = 'image' and cost_usd is null and listing_id is not null`;
const images = await sql`select id, listing_id, model, created_at, base_image_id from listing_image`;

const pairs = [];
for (const e of events) {
  const start = e.created_at.getTime() - (e.ms ?? 0);
  for (const img of images) {
    if (img.listing_id !== e.listing_id || img.model !== e.model) continue;
    const d = Math.abs(img.created_at.getTime() - start);
    if (d <= 5000 && img.created_at <= e.created_at) pairs.push({ e: e.id, img, d });
  }
}
pairs.sort((a, b) => a.d - b.d);
const usedE = new Set(), usedI = new Set();
let linked = 0;
await sql`update usage_event set image_id = null where kind = 'image' and cost_usd is null`;
for (const p of pairs) {
  if (usedE.has(p.e) || usedI.has(p.img.id)) continue;
  usedE.add(p.e); usedI.add(p.img.id);
  const purpose = p.img.base_image_id ? "edit" : "image";
  await sql`update usage_event set image_id = ${p.img.id}, purpose = ${purpose} where id = ${p.e}`;
  linked++;
}
console.log(`linked ${linked} of ${events.length} old image calls (the rest belong to deleted versions)`);
