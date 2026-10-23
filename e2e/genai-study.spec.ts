import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("GenAI study notes: open a sub-topic, reveal an answer, rate it and keep it after reload", async ({ page }) => {
  await signIn(page);
  await page.goto("/roadmaps/genai-16-levels/m3-1");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Anatomy of a prompt");

  const card = page.locator("#sub-the-parts-of-a-prompt");
  await card.locator("summary").click();
  await expect(card.getByText("Check yourself")).toBeVisible();

  await card.getByRole("button", { name: "Answer" }).first().click();
  await expect(card.getByRole("button", { name: "Hide" }).first()).toBeVisible();

  await card.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByText("1/3 got it")).toBeVisible();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("1/3 got it")).toBeVisible();
});

test("GenAI study notes: a node with no notes explains that, and an unknown node shows the not-found page", async ({ page }) => {
  await signIn(page);
  await page.goto("/roadmaps/genai-16-levels/m3-2");
  await expect(page.getByText("Study notes are not written for this topic yet")).toBeVisible();
  await page.goto("/roadmaps/genai-16-levels/does-not-exist");
  await expect(page.getByText("Nothing here")).toBeVisible();
});
