import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { availableImageModels } from "@/lib/ai/providers";
import { costOf } from "@/lib/ai/pricing";
import { db, schema } from "@/lib/db";
import type { ModelOptionDTO } from "./types";

const { usageEvents } = schema;
const TTL_MS = 60_000;
let cache: { at: number; stats: Map<string, { avgUsd: number | null; avgMs: number | null }> } | undefined;

/** Average cost and time per image model from this app's own successful image calls (cached 1 min). */
async function modelStats() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.stats;
  const rows = await (await db())
    .select({ model: usageEvents.model, costUsd: usageEvents.costUsd, usage: usageEvents.usage, ms: usageEvents.ms })
    .from(usageEvents)
    .where(and(eq(usageEvents.kind, "image"), eq(usageEvents.ok, true), isNotNull(usageEvents.usage), sql`coalesce(${usageEvents.purpose}, 'image') = 'image'`));
  const acc = new Map<string, { cost: number; costN: number; ms: number; msN: number }>();
  for (const r of rows) {
    const a = acc.get(r.model) ?? { cost: 0, costN: 0, ms: 0, msN: 0 };
    const cost = r.costUsd ?? costOf(r.model, r.usage).costUsd;
    if (cost !== null && cost > 0) { a.cost += cost; a.costN++; }
    if (r.ms) { a.ms += r.ms; a.msN++; }
    acc.set(r.model, a);
  }
  const stats = new Map<string, { avgUsd: number | null; avgMs: number | null }>();
  for (const [model, a] of acc) stats.set(model, { avgUsd: a.costN ? a.cost / a.costN : null, avgMs: a.msN ? a.ms / a.msN : null });
  cache = { at: Date.now(), stats };
  return stats;
}

export async function modelOptions(): Promise<ModelOptionDTO[]> {
  const stats = await modelStats().catch(() => new Map<string, { avgUsd: number | null; avgMs: number | null }>());
  return availableImageModels().map((m) => {
    const s = stats.get(m.id);
    const yours = s?.avgUsd ?? null;
    return {
      id: m.id,
      provider: m.provider,
      label: m.label,
      blurb: m.blurb,
      estimateUsd: m.officialPerImageUsd ?? yours,
      estimateSource: m.officialPerImageUsd !== undefined ? "official" : yours !== null ? "yours" : null,
      avgSeconds: s?.avgMs ? Math.round(s.avgMs / 1000) : null,
    };
  });
}
