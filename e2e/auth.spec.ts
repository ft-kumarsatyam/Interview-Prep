import { expect, test } from "@playwright/test";
import { E2E, signIn } from "./helpers";

test.describe("signing in", () => {
  test("signed-out visitors are sent to the login page, for pages and for the API", async ({ page, request }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect((await request.get("/api/v1/jobs")).status()).toBe(401);
    expect((await request.get("/api/cron/morning")).status()).toBe(401);
  });

  test("a wrong password is refused with a message and no session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(/incorrect|invalid|wrong/i);
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the right password opens the dashboard, and the session survives a reload", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
