import path from "node:path";
import { expect, test } from "@playwright/test";

test("upload → listing details → images → export", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Upload a photo/ })).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, "fixtures/product.jpg"));
  // Second angle of the same product via the "Add angle" tile.
  await page.locator('input[type="file"]').last().setInputFiles(path.join(__dirname, "fixtures/product-angle.jpg"));
  await expect(page.getByText("2 of 4")).toBeVisible();
  await page.getByRole("radio", { name: "2 images" }).click();
  await page.getByRole("button", { name: /Generate 2 images/ }).click();

  await page.waitForURL(/\/listing\//);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pack of 2");
  await expect(page.getByText("Meesho fields — copy & paste")).toBeVisible();
  await expect(page.getByText("Your photos (2)")).toBeVisible();

  // Dual mode: 2 slots × 2 providers.
  await expect(page.getByText("2 of 2 images ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Selected" })).toHaveCount(2, { timeout: 30_000 });

  await page.getByRole("button", { name: /Export listing/ }).click();
  await page.getByLabel("SKU / file prefix").fill("E2E-1");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download ZIP/ }).click();
  expect((await download).suggestedFilename()).toBe("E2E-1_meesho.zip");
});
