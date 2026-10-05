// One-off: write cost_usd / token counts for usage rows recorded before cost tracking,
// so removing a model's price later never blanks out past costs.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const { costOf } = await import(process.argv[2]);
const rows = await sql`select id, model, usage, ok from usage_event where cost_usd is null`;
let n = 0;
for (const r of rows) {
  const c = r.ok && r.usage ? costOf(r.model, r.usage) : { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  if (c.costUsd === null) continue;
  await sql`update usage_event set cost_usd = ${c.costUsd}, input_tokens = ${c.inputTokens}, output_tokens = ${c.outputTokens} where id = ${r.id}`;
  n++;
}
console.log(`saved cost for ${n} of ${rows.length} rows`);
