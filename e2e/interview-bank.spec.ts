import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("interview bank", () => {
  test("a question rated 'Got it' stays rated after a reload", async ({ page }) => {
    await signIn(page);
    await page.goto("/web/interview/sql");
    await expect(page.getByRole("heading", { name: /SQL/ }).first()).toBeVisible();
    const row = page.locator("ol > li").first();
    await row.getByRole("button", { expanded: false }).click(); // open the question
    await row.getByRole("button", { name: /Got it/ }).click();
    await expect(row.getByText("Got it").first()).toBeVisible();
    await page.reload();
    // After the reload the first question still carries the "Got it" badge.
    await expect(page.locator("ol > li").first().getByText("Got it").first()).toBeVisible();
  });

  test("a track offers to add AI-written questions, and says what is missing when there is no key", async ({ page }) => {
    await signIn(page);
    await page.goto("/web/interview/sql");
    await page.getByRole("button", { name: /Add 3 questions with AI/ }).click();
    await expect(page.getByText(/provider|key|configured/i).first()).toBeVisible();
  });
});
