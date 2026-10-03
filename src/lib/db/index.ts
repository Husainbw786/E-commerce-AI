import "server-only";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

const globalForDb = globalThis as unknown as { __listoraDb?: Promise<Db> };

/**
 * Neon when DATABASE_URL is set (Vercel / prod).
 * Without it (local dev before creds exist) we fall back to PGlite — real Postgres
 * running in-process, stored in .data/pglite, with migrations applied on start.
 */
async function create(): Promise<Db> {
  const url = env().DATABASE_URL;
  if (url) return drizzleNeon(neon(url), { schema });

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add the Neon integration in Vercel.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // Both drivers expose the same query builder for everything we use.
  return db as unknown as Db;
}

export function db(): Promise<Db> {
  globalForDb.__listoraDb ??= create();
  return globalForDb.__listoraDb;
}

export { schema };
