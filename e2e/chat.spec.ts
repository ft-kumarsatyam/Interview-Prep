import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/** With no AI key the assistant still saves the conversation and says how to enable answers. */
test("assistant without a provider saves the thread and explains what is missing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page);
  await page.goto("/chat");
  await expect(page.getByText("No AI provider is configured yet")).toBeVisible();

  await page.getByLabel("Message").fill("How is my streak going?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No AI provider is configured" })).toBeVisible();
  await expect(page).toHaveURL(/\/chat\?t=[0-9a-f]{24}/);

  await page.reload();
  await expect(page.getByRole("heading", { name: "How is my streak going", exact: true })).toBeVisible();
  await expect(page.getByText("How is my streak going?", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
