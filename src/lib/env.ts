import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  OPENAI_API_KEY: optional,
  GEMINI_API_KEY: optional,
  OPENAI_TEXT_MODEL: z.string().default("gpt-6-astra"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2.5-flare"),
  OPENAI_IMAGE_QUALITY: z.enum(["low", "medium", "high", "xhigh", "max", "auto"]).default("high"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-3.1-flash-image"),
  IMAGE_MODE: z.enum(["dual", "fallback"]).default("dual"),
  // Comma-separated provider order. In fallback mode the first one runs first.
  IMAGE_PROVIDERS: z.string().default("gemini,openai"),
  MOCK_AI: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),

  DATABASE_URL: optional,
  BLOB_READ_WRITE_TOKEN: optional,
  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,

  DAILY_LISTING_LIMIT: z.coerce.number().int().positive().default(20),
  DAILY_IMAGE_LIMIT: z.coerce.number().int().positive().default(150),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export function requireKey(name: "OPENAI_API_KEY" | "GEMINI_API_KEY"): string {
  const value = env()[name];
  if (!value) throw new ConfigError(`${name} is not set. Add it to .env.local (or Vercel env vars).`);
  return value;
}

export class ConfigError extends Error {}
