import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

type Bucket = "listing" | "image" | "upload";

let limiters: Record<Bucket, Ratelimit[]> | null | undefined;

function build(): Record<Bucket, Ratelimit[]> | null {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env();
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  const make = (prefix: string, n: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) =>
    new Ratelimit({ redis, prefix: `listora:${prefix}`, limiter: Ratelimit.slidingWindow(n, window) });
  return {
    listing: [make("listing:min", 5, "1 m"), make("listing:day", env().DAILY_LISTING_LIMIT, "1 d")],
    image: [make("image:min", 20, "1 m"), make("image:day", env().DAILY_IMAGE_LIMIT, "1 d")],
    upload: [make("upload:min", 10, "1 m")],
  };
}

/** Returns null when allowed, or a message when the caller is over a limit. No Upstash = no limits (dev). */
export async function checkRateLimit(bucket: Bucket, key: string): Promise<string | null> {
  if (limiters === undefined) limiters = build();
  if (!limiters) return null;
  for (const limiter of limiters[bucket]) {
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const mins = Math.max(1, Math.ceil((reset - Date.now()) / 60_000));
      return `Too many requests. Try again in about ${mins} minute${mins > 1 ? "s" : ""}.`;
    }
  }
  return null;
}
