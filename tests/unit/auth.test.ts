import { afterEach, describe, expect, it } from "vitest";
import { authToken, isAuthorized, passwordMatches, safeNextPath, sitePassword } from "@/lib/auth";

describe("site password", () => {
  afterEach(() => {
    delete process.env.SITE_PASSWORD;
  });

  it("is 'amazon' unless SITE_PASSWORD says otherwise", () => {
    expect(sitePassword()).toBe("amazon");
    expect(passwordMatches("amazon")).toBe(true);
    expect(passwordMatches(" amazon ")).toBe(true);
    expect(passwordMatches("Amazon")).toBe(false);
    expect(passwordMatches("")).toBe(false);

    process.env.SITE_PASSWORD = "secret";
    expect(passwordMatches("amazon")).toBe(false);
    expect(passwordMatches("secret")).toBe(true);
  });

  it("stores a hash in the cookie, never the password", async () => {
    const token = await authToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(token).not.toContain("amazon");
    expect(await isAuthorized(token)).toBe(true);
    expect(await isAuthorized(undefined)).toBe(false);
    expect(await isAuthorized("")).toBe(false);
    expect(await isAuthorized("amazon")).toBe(false);
    expect(await isAuthorized(token.replace(/^./, (c) => (c === "0" ? "1" : "0")))).toBe(false);
  });

  it("changing the password signs old cookies out", async () => {
    const old = await authToken();
    process.env.SITE_PASSWORD = "new-password";
    expect(await isAuthorized(old)).toBe(false);
    expect(await isAuthorized(await authToken())).toBe(true);
  });

  it("only sends people back to same-site paths after signing in", () => {
    expect(safeNextPath("/listing/abc?x=1")).toBe("/listing/abc?x=1");
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("library")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/login?next=%2F")).toBe("/");
  });
});
