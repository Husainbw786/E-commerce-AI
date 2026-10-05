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
  // Only the newest models are offered; pick a specific one.
  await expect(page.getByRole("radio", { name: /Nano Banana Pro/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /GPT Image 2\.5 Sunburst/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /GPT Image 1/ })).toHaveCount(0);
  await page.getByRole("radio", { name: /GPT Image 2\.5 Flare/ }).click();
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
  await expect(page.getByText("Images: GPT Image 2.5 Flare")).toBeVisible();

  // A fresh version of the primary image with a different model.
  const primarySlot = page.locator("section", { has: page.getByRole("heading", { name: "Primary image" }) });
  await primarySlot.getByLabel("Or make a fresh version with").selectOption("gemini-3-pro-image");
  await primarySlot.getByRole("button", { name: "New version" }).click();
  await expect(primarySlot.getByText("Nano Banana Pro", { exact: true })).toBeVisible({ timeout: 30_000 });
  page.once("dialog", (d) => d.accept());
  await primarySlot.getByRole("button", { name: "Delete version 2" }).click();
  await expect(primarySlot.getByText("v2", { exact: true })).toHaveCount(0);

  // Edit the primary image: the original stays, a v2 appears.
  const primary = page.locator("section", { has: page.getByRole("heading", { name: "Primary image" }) });
  await primary.getByLabel(/Change v1/).fill("zoom out a little");
  await primary.getByRole("button", { name: "Apply to v1" }).click();
  await expect(primary.getByText("v2", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(primary.getByText("v1", { exact: true }).first()).toBeVisible();
  await expect(primary.getByText("“zoom out a little”")).toBeVisible();

  // Edit v2 (not the exported pick) via its own Edit button → v3; v1 stays the pick.
  await primary.getByRole("button", { name: "Edit version 2" }).click();
  await primary.getByLabel(/Change v2/).fill("zoom in a little");
  await primary.getByRole("button", { name: "Apply to v2" }).click();
  await expect(primary.getByText("v3", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(primary.getByRole("button", { name: "Selected" })).toHaveCount(1);

  // Delete v3 → v1 and v2 left.
  page.once("dialog", (d) => d.accept());
  await primary.getByRole("button", { name: "Delete version 3" }).click();
  await expect(primary.getByText("v3", { exact: true })).toHaveCount(0);
  await expect(primary.getByText("v2", { exact: true }).first()).toBeVisible();

  // Every AI call is listed with its cost (mock AI = $0).
  await expect(page.getByText(/AI cost: \$0/)).toBeVisible();
  await page.getByRole("button", { name: "Show breakdown" }).click();
  await expect(page.getByRole("cell", { name: "Questions before listing" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Listing details" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Image · Primary image v1" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Image · In use v1" })).toBeVisible();
  // Zoom edits are done in code, not by AI — they don't appear as AI calls.
  await expect(page.getByRole("cell", { name: /Image edit/ })).toHaveCount(0);

  await page.getByRole("button", { name: /Export listing/ }).click();
  await page.getByLabel("SKU / file prefix").fill("E2E-1");
  await expect(page.getByText("E2E-1_3_lifestyle.jpg")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download ZIP/ }).click();
  expect((await download).suggestedFilename()).toBe("E2E-1_meesho.zip");
});
