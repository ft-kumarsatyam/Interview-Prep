import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("GenAI sprint: toggle a task and reload", async ({ page }) => {
  await signIn(page);
  await page.goto("/genai-sprint/plan");
  await page.waitForLoadState("networkidle");
  const box = page.getByRole("checkbox").first();
  const before = await box.getAttribute("aria-checked");
  const next = before === "true" ? "false" : "true";
  const posted = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await box.click();
  await posted;
  await expect(box).toHaveAttribute("aria-checked", next);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", next);
});
