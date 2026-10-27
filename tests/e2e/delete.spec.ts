import path from "node:path";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("delete a listing from the library removes its photos, images and details", async ({ page }) => {
  await signIn(page);
  await page.goto("/");
  await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, "fixtures/product.jpg"));
  await page.getByRole("radio", { name: "1 image" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("A few quick questions")).toBeVisible();
  await page.getByRole("button", { name: "Generate listing" }).click();
  await page.waitForURL(/\/listing\//);
  await expect(page.getByText("1 of 1 image ready")).toBeVisible({ timeout: 30_000 });

  const id = page.url().split("/listing/")[1];
  // Give it a unique bag title so we can find its row.
  const title = `Women's Leather Tote Bag ${Date.now()}`;
  expect((await page.request.patch(`/api/listings/${id}`, { data: { title } })).ok()).toBe(true);
  const { listing } = await (await page.request.get(`/api/listings/${id}`)).json();
  const files: string[] = [...listing.sourceUrls, ...listing.images.map((i: { url: string }) => i.url)];
  expect(files.length).toBeGreaterThan(1);
  for (const f of files) expect((await page.request.get(f)).ok()).toBe(true);

  await page.goto("/library");
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByText("Listing deleted")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);

  // Details and every stored file are gone.
  expect((await page.request.get(`/api/listings/${id}`)).status()).toBe(404);
  for (const f of files) expect((await page.request.get(f)).status()).toBe(404);
});
