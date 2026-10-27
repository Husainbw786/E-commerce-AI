import type { Page } from "@playwright/test";

/** Must match `SITE_PASSWORD` in playwright.config.ts. */
export const SITE_PASSWORD = "amazon";

/** Enter the site password once; the cookie then covers the rest of the test. */
export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Password").fill(SITE_PASSWORD);
  await page.getByRole("button", { name: "Open Listora" }).click();
  await page.waitForURL("/");
}
