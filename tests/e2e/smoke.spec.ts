import path from "node:path";
import { expect, test } from "@playwright/test";

test("upload → questions → listing → images, edit, versions → export", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Upload a photo/ })).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, "fixtures/product.jpg"));
  // Second angle of the same product via the "Add angle" tile.
  await page.locator('input[type="file"]').last().setInputFiles(path.join(__dirname, "fixtures/product-angle.jpg"));
  await expect(page.getByText("2 of 4")).toBeVisible();
  await page.getByRole("radio", { name: "2 images" }).click();
  await page.getByRole("radio", { name: /OpenAI/ }).click();
  await page.getByLabel("Anything the AI should know? (optional)").fill("Sold in blue and black");

  // "Ask me questions first" is on by default.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("A few quick questions")).toBeVisible();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: "Yes, add it" }).click();
  await expect(page.getByLabel("Scene (edit if you like)")).not.toHaveValue("");
  await page.getByRole("button", { name: "Generate listing" }).click();

  await page.waitForURL(/\/listing\//);
  await expect(page.getByText("Your photos (2)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "In use" })).toBeVisible();
  // 2 picked + 1 in-use image, chosen model only.
  await expect(page.getByText("3 of 3 images ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Images: OpenAI")).toBeVisible();

  // Edit the primary image: the original stays, a v2 appears.
  const primary = page.locator("section", { has: page.getByRole("heading", { name: "Primary image" }) });
  await primary.getByLabel(/Change the selected image/).fill("zoom out a little");
  await primary.getByRole("button", { name: "Apply change" }).click();
  await expect(primary.getByText("v2", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(primary.getByText("v1", { exact: true })).toBeVisible();
  await expect(primary.getByText("“zoom out a little”")).toBeVisible();

  // Delete v2 → only v1 left.
  page.once("dialog", (d) => d.accept());
  await primary.getByRole("button", { name: "Delete version 2" }).click();
  await expect(primary.getByText("v2", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /Export listing/ }).click();
  await page.getByLabel("SKU / file prefix").fill("E2E-1");
  await expect(page.getByText("E2E-1_3_lifestyle.jpg")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download ZIP/ }).click();
  expect((await download).suggestedFilename()).toBe("E2E-1_meesho.zip");
});
