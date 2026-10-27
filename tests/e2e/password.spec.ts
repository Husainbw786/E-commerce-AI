import { expect, test } from "@playwright/test";
import { SITE_PASSWORD } from "./helpers";

test("asks for the password once, then remembers the browser", async ({ page, request }) => {
  // Not signed in: pages go to /login (remembering where you were), the API answers 401.
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login\?next=%2Flibrary$/);
  await expect(page.getByRole("heading", { name: "Enter the password" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Library" })).toHaveCount(0);
  expect((await request.get("/api/listings")).status()).toBe(401);
  expect((await request.get("/api/health")).status()).toBe(200);

  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Open Listora" }).click();
  await expect(page.getByText("That's not it. Try again.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Password").fill(SITE_PASSWORD);
  await page.getByRole("button", { name: "Open Listora" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

  // Reloading or coming back does not ask again.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Upload a photo/ })).toBeVisible();

  // Signed-in browsers skip the login page.
  await page.goto("/login");
  await expect(page).toHaveURL(/:\d+\/$/);
});
