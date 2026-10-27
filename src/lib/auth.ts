/**
 * Site-wide password gate.
 *
 * Used by `src/proxy.ts` (runs in front of every request) and by the login action, so this
 * file stays free of `server-only`, zod and Node-only APIs: only Web Crypto, which both the
 * proxy and route runtimes provide.
 */

export const AUTH_COOKIE = "listora_auth";
/** How long a browser stays signed in after entering the password once. */
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const DEFAULT_PASSWORD = "amazon";

/** The one password everyone shares. `SITE_PASSWORD` overrides the default; changing it signs every browser out. */
export function sitePassword(): string {
  const configured = process.env.SITE_PASSWORD?.trim();
  return configured ? configured : DEFAULT_PASSWORD;
}

export function passwordMatches(input: string): boolean {
  return constantTimeEqual(input.trim(), sitePassword());
}

/** Cookie value: a hash of the password, so the password itself is never stored in the browser. */
export async function authToken(password = sitePassword()): Promise<string> {
  const bytes = new TextEncoder().encode(`listora-auth:v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAuthorized(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  return constantTimeEqual(cookieValue, await authToken());
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_MAX_AGE_SECONDS,
  };
}

/** Where to send the user after signing in: only same-site paths, never `//evil.com` or absolute URLs. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.startsWith("/login")) return "/";
  return value;
}

function constantTimeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
